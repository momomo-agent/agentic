/**
 * agentic-core — LLM streaming, tool execution, provider abstraction
 */

'use strict'

// loop-detection.js — 完全对齐 OpenClaw tool-loop-detection.ts
// 浏览器端实现（无 node:crypto，用简单哈希替代）

const WARNING_THRESHOLD = 10
const CRITICAL_THRESHOLD = 20
const GLOBAL_CIRCUIT_BREAKER_THRESHOLD = 30
const TOOL_CALL_HISTORY_SIZE = 30
const EAGER_HINT = 'When you need to use tools, call them BEFORE writing your text response. This allows parallel execution while you compose your answer.'
const DEFAULT_OUTPUT_MAX_TOKENS = 4096
const MAX_ANTHROPIC_OUTPUT_TOKENS = 32000
const MAX_ANTHROPIC_CACHE_CONTROL_BLOCKS = 4

// ── Hash helpers (browser-safe) ──

function simpleHash(value) {
  const str = typeof value === 'string' ? value : stableStringify(value)
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16)
}

function stableStringify(value, seen = new WeakSet()) {
  if (value === undefined) return 'undefined'
  if (value === null) return 'null'
  if (typeof value !== 'object') {
    try {
      const json = JSON.stringify(value)
      return typeof json === 'string' ? json : String(value)
    } catch {
      return String(value)
    }
  }
  if (seen.has(value)) return '"[Circular]"'
  seen.add(value)
  if (Array.isArray(value)) {
    const out = `[${Array.from(value, item => stableStringify(item, seen)).join(',')}]`
    seen.delete(value)
    return out
  }
  const keys = Object.keys(value).sort()
  const out = `{${keys.map(k => `${JSON.stringify(k)}:${stableStringify(value[k], seen)}`).join(',')}}`
  seen.delete(value)
  return out
}

function hashToolCall(toolName, params) {
  return `${toolName}:${simpleHash(stableStringify(params))}`
}

function hashToolOutcome(toolName, params, result, error) {
  if (error !== undefined) {
    return `error:${simpleHash(String(error))}`
  }
  if (result === undefined) return undefined

  // Extract text content (OpenClaw format)
  let text = ''
  if (result && typeof result === 'object' && Array.isArray(result.content)) {
    text = result.content
      .filter(e => e && typeof e.type === 'string' && typeof e.text === 'string')
      .map(e => e.text)
      .join('\n')
      .trim()
  }

  const details = (result && typeof result === 'object' && result.details) || {}

  // Known poll tools get special hashing
  if (isKnownPollToolCall(toolName, params)) {
    if (typeof params === 'object' && params !== null) {
      const action = params.action
      if (action === 'poll') {
        return simpleHash(stableStringify({
          action, status: details.status,
          exitCode: details.exitCode ?? null, exitSignal: details.exitSignal ?? null,
          aggregated: details.aggregated ?? null, text,
        }))
      }
      if (action === 'log') {
        return simpleHash(stableStringify({
          action, status: details.status,
          totalLines: details.totalLines ?? null, totalChars: details.totalChars ?? null,
          truncated: details.truncated ?? null,
          exitCode: details.exitCode ?? null, exitSignal: details.exitSignal ?? null, text,
        }))
      }
    }
  }

  return simpleHash(stableStringify({ details, text }))
}

function isKnownPollToolCall(toolName, params) {
  if (toolName === 'command_status') return true
  if (toolName !== 'process' || typeof params !== 'object' || params === null) return false
  return params.action === 'poll' || params.action === 'log'
}

// ── No-progress streak ──

function getNoProgressStreak(history, toolName, argsHash) {
  let streak = 0
  let latestResultHash = undefined

  for (let i = history.length - 1; i >= 0; i--) {
    const record = history[i]
    if (!record || record.toolName !== toolName || record.argsHash !== argsHash) continue
    if (typeof record.resultHash !== 'string' || !record.resultHash) continue

    if (!latestResultHash) {
      latestResultHash = record.resultHash
      streak = 1
      continue
    }
    if (record.resultHash !== latestResultHash) break
    streak++
  }

  return { count: streak, latestResultHash }
}

// ── Ping-pong detection ──

function getPingPongStreak(history, currentHash) {
  const last = history[history.length - 1]
  if (!last) return { count: 0, noProgressEvidence: false }

  let otherSignature, otherToolName
  for (let i = history.length - 2; i >= 0; i--) {
    const call = history[i]
    if (!call) continue
    if (call.argsHash !== last.argsHash) {
      otherSignature = call.argsHash
      otherToolName = call.toolName
      break
    }
  }

  if (!otherSignature || !otherToolName) return { count: 0, noProgressEvidence: false }

  let alternatingTailCount = 0
  for (let i = history.length - 1; i >= 0; i--) {
    const call = history[i]
    if (!call) continue
    const expected = alternatingTailCount % 2 === 0 ? last.argsHash : otherSignature
    if (call.argsHash !== expected) break
    alternatingTailCount++
  }

  if (alternatingTailCount < 2) return { count: 0, noProgressEvidence: false }
  if (currentHash !== otherSignature) return { count: 0, noProgressEvidence: false }

  const tailStart = Math.max(0, history.length - alternatingTailCount)
  let firstHashA, firstHashB
  let noProgressEvidence = true

  for (let i = tailStart; i < history.length; i++) {
    const call = history[i]
    if (!call || !call.resultHash) { noProgressEvidence = false; break }

    if (call.argsHash === last.argsHash) {
      if (!firstHashA) firstHashA = call.resultHash
      else if (firstHashA !== call.resultHash) { noProgressEvidence = false; break }
    } else if (call.argsHash === otherSignature) {
      if (!firstHashB) firstHashB = call.resultHash
      else if (firstHashB !== call.resultHash) { noProgressEvidence = false; break }
    } else {
      noProgressEvidence = false; break
    }
  }

  if (!firstHashA || !firstHashB) noProgressEvidence = false

  return {
    count: alternatingTailCount + 1,
    pairedToolName: last.toolName,
    pairedSignature: last.argsHash,
    noProgressEvidence,
  }
}

// ── Main detection (exact OpenClaw logic) ──

function detectToolCallLoop(state, toolName, params) {
  const history = state.toolCallHistory || []
  const currentHash = hashToolCall(toolName, params)
  const noProgress = getNoProgressStreak(history, toolName, currentHash)
  const noProgressStreak = noProgress.count
  const knownPollTool = isKnownPollToolCall(toolName, params)
  const pingPong = getPingPongStreak(history, currentHash)

  // 1. Global circuit breaker
  if (noProgressStreak >= GLOBAL_CIRCUIT_BREAKER_THRESHOLD) {
    return {
      stuck: true, level: 'critical', detector: 'global_circuit_breaker',
      count: noProgressStreak,
      message: `CRITICAL: ${toolName} has repeated identical no-progress outcomes ${noProgressStreak} times. Session execution blocked by global circuit breaker to prevent runaway loops.`,
    }
  }

  // 2. Known poll no-progress (critical)
  if (knownPollTool && noProgressStreak >= CRITICAL_THRESHOLD) {
    return {
      stuck: true, level: 'critical', detector: 'known_poll_no_progress',
      count: noProgressStreak,
      message: `CRITICAL: Called ${toolName} with identical arguments and no progress ${noProgressStreak} times. This appears to be a stuck polling loop. Session execution blocked to prevent resource waste.`,
    }
  }

  // 3. Known poll no-progress (warning)
  if (knownPollTool && noProgressStreak >= WARNING_THRESHOLD) {
    return {
      stuck: true, level: 'warning', detector: 'known_poll_no_progress',
      count: noProgressStreak,
      message: `WARNING: You have called ${toolName} ${noProgressStreak} times with identical arguments and no progress. Stop polling and either (1) increase wait time between checks, or (2) report the task as failed if the process is stuck.`,
    }
  }

  // 4. Ping-pong (critical)
  if (pingPong.count >= CRITICAL_THRESHOLD && pingPong.noProgressEvidence) {
    return {
      stuck: true, level: 'critical', detector: 'ping_pong',
      count: pingPong.count,
      message: `CRITICAL: You are alternating between repeated tool-call patterns (${pingPong.count} consecutive calls) with no progress. This appears to be a stuck ping-pong loop. Session execution blocked to prevent resource waste.`,
      pairedToolName: pingPong.pairedToolName,
    }
  }

  // 5. Ping-pong (warning)
  if (pingPong.count >= WARNING_THRESHOLD) {
    return {
      stuck: true, level: 'warning', detector: 'ping_pong',
      count: pingPong.count,
      message: `WARNING: You are alternating between repeated tool-call patterns (${pingPong.count} consecutive calls). This looks like a ping-pong loop; stop retrying and report the task as failed.`,
      pairedToolName: pingPong.pairedToolName,
    }
  }

  // 6. Generic repeat (warning only, identical args)
  const recentCount = history.filter(
    h => h.toolName === toolName && h.argsHash === currentHash
  ).length

  if (!knownPollTool && recentCount >= WARNING_THRESHOLD) {
    return {
      stuck: true, level: 'warning', detector: 'generic_repeat',
      count: recentCount,
      message: `WARNING: You have called ${toolName} ${recentCount} times with identical arguments. If this is not making progress, stop retrying and report the task as failed.`,
    }
  }

  return { stuck: false }
}

// ── Record helpers ──

function recordToolCall(state, toolName, params) {
  if (!state.toolCallHistory) state.toolCallHistory = []

  state.toolCallHistory.push({
    toolName,
    argsHash: hashToolCall(toolName, params),
    timestamp: Date.now(),
  })

  if (state.toolCallHistory.length > TOOL_CALL_HISTORY_SIZE) {
    state.toolCallHistory.shift()
  }
}

function recordToolCallOutcome(state, toolName, params, result, error) {
  if (!state.toolCallHistory) state.toolCallHistory = []

  const argsHash = hashToolCall(toolName, params)
  const resultHash = hashToolOutcome(toolName, params, result, error)
  if (!resultHash) return

  // Find last matching unresolved record
  let matched = false
  for (let i = state.toolCallHistory.length - 1; i >= 0; i--) {
    const call = state.toolCallHistory[i]
    if (!call || call.toolName !== toolName || call.argsHash !== argsHash) continue
    if (call.resultHash !== undefined) continue
    call.resultHash = resultHash
    matched = true
    break
  }

  if (!matched) {
    state.toolCallHistory.push({
      toolName, argsHash, resultHash, timestamp: Date.now(),
    })
  }

  if (state.toolCallHistory.length > TOOL_CALL_HISTORY_SIZE) {
    state.toolCallHistory.splice(0, state.toolCallHistory.length - TOOL_CALL_HISTORY_SIZE)
  }
}

// agentic-agent.js - 前端 Agent Loop
// 完全端侧运行，通过可配置的 proxy 调用 LLM
// 支持流式输出 (stream) + 智能循环检测（对齐 OpenClaw）

// ── Error Classification ──

function classifyError(err) {
  const msg = (err && typeof err === 'object' ? err.message || '' : String(err)).toLowerCase()
  const status = err && err.status ? err.status : 0

  if (status === 401 || status === 403 || /unauthorized|forbidden|invalid.*api.?key|authentication/i.test(msg))
    return { category: 'auth', retryable: false }
  if (status === 402 || /billing|payment|quota exceeded|insufficient.?funds/i.test(msg))
    return { category: 'billing', retryable: false }
  if (status === 429 || /rate.?limit|too many requests/i.test(msg))
    return { category: 'rate_limit', retryable: true }
  if (/context.?length|token.?limit|maximum.?context|too.?long/i.test(msg))
    return { category: 'context_overflow', retryable: false }
  if (err?.code === MODEL_REQUEST_FIRST_EVENT_TIMEOUT || err?.code === MODEL_STREAM_IDLE_TIMEOUT)
    return { category: err.code, retryable: false }
  if (status >= 500 || status === 529 || /server.?error|internal.?error|bad.?gateway|service.?unavailable/i.test(msg))
    return { category: 'server', retryable: true }
  if (/network|econnrefused|econnreset|etimedout|fetch.?failed|dns|socket|terminated|connection.?closed|other.?side.?closed|und_err_/i.test(msg))
    return { category: 'network', retryable: true }
  return { category: 'unknown', retryable: false }
}

const DEFAULT_MODEL_RETRIES = 5
const DEFAULT_MODEL_RETRY_DELAY_MS = 500
const MAX_MODEL_RETRY_DELAY_MS = 4000
const DEFAULT_RATE_LIMIT_RETRY_DELAY_MS = 5000
const MAX_RATE_LIMIT_RETRY_DELAY_MS = 60000
const MODEL_REQUEST_FIRST_EVENT_TIMEOUT = 'model_request_first_event_timeout'
const MODEL_STREAM_IDLE_TIMEOUT = 'model_stream_idle_timeout'

function normalizeRetryCount(retries) {
  const n = Number(retries)
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.floor(n)
}

async function drainSteerQueue(steer) {
  if (!steer || typeof steer.drain !== 'function') return null
  try { return await steer.drain() } catch (e) { return null }
}

function isAbortError(err, signal) {
  return !!signal?.aborted || err?.name === 'AbortError'
}

function annotateModelError(err, meta = {}) {
  if (!err || typeof err !== 'object') return err
  err.provider = err.provider || meta.provider
  err.model = err.model || meta.model
  err.baseUrl = err.baseUrl || meta.baseUrl
  err.baseUrlHost = err.baseUrlHost || safeUrlHost(meta.baseUrl)
  err.url = err.url || meta.url
  err.urlHost = err.urlHost || safeUrlHost(meta.url)
  if (meta.requestBytes != null && err.requestBytes == null) err.requestBytes = meta.requestBytes
  const rateLimitHeaders = meta.rateLimitHeaders || sanitizeRateLimitHeaders(meta.headers || meta.responseHeaders)
  if (rateLimitHeaders && Object.keys(rateLimitHeaders).length && err.rateLimitHeaders == null) err.rateLimitHeaders = rateLimitHeaders
  const retryAfterMs = meta.retryAfterMs ?? retryAfterMsFromHeaders(meta.headers || meta.responseHeaders)
  if (retryAfterMs != null && err.retryAfterMs == null) err.retryAfterMs = retryAfterMs
  return err
}

function modelErrorEvent(err, cls, attempt, maxModelRetries) {
  return compactEvent({
    type: 'error',
    error: err?.message || String(err),
    category: cls.category,
    retryable: cls.retryable,
    attempts: attempt + 1,
    retries: maxModelRetries,
    causeCode: err?.cause?.code || err?.code,
    causeName: err?.cause?.name || err?.name,
    causeMessage: err?.cause?.message,
    status: err?.status || err?.statusCode,
    provider: err?.provider,
    model: err?.model,
    baseUrlHost: err?.baseUrlHost,
    urlHost: err?.urlHost,
    requestBytes: err?.requestBytes,
    retryAfterMs: err?.retryAfterMs,
    rateLimitHeaders: err?.rateLimitHeaders,
    requestId: err?.requestId,
    requestSeq: err?.requestSeq,
    requestReason: err?.requestReason,
    requestStage: err?.requestStage,
    firstEventType: err?.firstEventType,
    timeoutMs: err?.timeoutMs,
  })
}

function compactEvent(event) {
  return Object.fromEntries(Object.entries(event).filter(([, value]) => value !== undefined && value !== ''))
}

function modelRequestStageForReason(reason) {
  if (reason === 'after_tool') return 'model_request_after_tool'
  if (reason === 'final_answer') return 'model_request_final_answer'
  if (reason === 'continuation') return 'model_request_continuation'
  return 'model_request'
}

function createModelRequest({ requestSeq, reason = 'initial', provider, model }) {
  return {
    type: 'modelRequestStart',
    requestId: `model_request:${requestSeq}`,
    requestSeq,
    reason,
    stage: modelRequestStageForReason(reason),
    provider,
    model,
    timestamp: Date.now(),
  }
}

function createModelRequestTimeoutError({ request, timeoutMs, kind, afterEventType }) {
  const firstEvent = kind === 'first_event'
  const code = firstEvent ? MODEL_REQUEST_FIRST_EVENT_TIMEOUT : MODEL_STREAM_IDLE_TIMEOUT
  const ms = Math.max(0, Number(timeoutMs) || 0)
  const error = new Error(firstEvent
    ? `Model request did not produce a first event within ${ms}ms.`
    : `Model stream did not produce another event within ${ms}ms after ${afterEventType || 'last_event'}.`)
  error.name = firstEvent ? 'ModelRequestFirstEventTimeout' : 'ModelStreamIdleTimeout'
  error.code = code
  error.timeoutMs = ms
  error.requestId = request?.requestId
  error.requestSeq = request?.requestSeq
  error.requestReason = request?.reason
  error.requestStage = request?.stage
  error.firstEventType = request?.firstEventType
  return error
}

function timeoutRace(promise, { request, timeoutMs, kind, afterEventType } = {}) {
  if (!timeoutMs || timeoutMs <= 0) return promise
  let timer = null
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(createModelRequestTimeoutError({ request, timeoutMs, kind, afterEventType })), Math.max(1, timeoutMs))
      timer.unref?.()
    }),
  ]).finally(() => {
    if (timer) clearTimeout(timer)
  })
}

function isModelRequestEventType(type) {
  return type === 'modelRequestStart'
    || type === 'modelRequestFirstEvent'
    || type === 'modelRequestEnd'
    || type === 'modelRequestError'
    || type === 'modelRequestTimeout'
}

async function* runModelRequest(gen, request, { firstEventTimeoutMs = 0, streamIdleTimeoutMs = 0 } = {}) {
  const iterator = gen?.[Symbol.asyncIterator]?.() || gen
  if (!iterator || typeof iterator.next !== 'function') return
  const startedAt = Date.now()
  let sawFirstEvent = false
  let lastEventType = ''
  yield request
  while (true) {
    const timeoutKind = sawFirstEvent ? 'stream_idle' : 'first_event'
    const timeoutMs = sawFirstEvent ? streamIdleTimeoutMs : firstEventTimeoutMs
    let step
    try {
      step = await timeoutRace(iterator.next(), { request, timeoutMs, kind: timeoutKind, afterEventType: lastEventType })
    } catch (error) {
      const event = {
        ...(error?.code === MODEL_REQUEST_FIRST_EVENT_TIMEOUT || error?.code === MODEL_STREAM_IDLE_TIMEOUT
          ? { type: 'modelRequestTimeout', timeoutMs: error.timeoutMs }
          : { type: 'modelRequestError' }),
        requestId: request.requestId,
        requestSeq: request.requestSeq,
        reason: request.reason,
        stage: request.stage,
        provider: request.provider,
        model: request.model,
        durationMs: Math.max(0, Date.now() - startedAt),
        errorType: error?.code || error?.name || 'model_request_failed',
        errorMessage: error?.message || String(error),
        firstEventType: request.firstEventType,
        timestamp: Date.now(),
      }
      yield compactEvent(event)
      throw error
    }
    if (!step || step.done) {
      yield compactEvent({
        type: 'modelRequestEnd',
        requestId: request.requestId,
        requestSeq: request.requestSeq,
        reason: request.reason,
        stage: request.stage,
        provider: request.provider,
        model: request.model,
        firstEventType: request.firstEventType,
        outcome: 'stream_end',
        durationMs: Math.max(0, Date.now() - startedAt),
        timestamp: Date.now(),
      })
      return
    }
    const event = step.value
    const eventType = event?.type || ''
    if (!sawFirstEvent) {
      sawFirstEvent = true
      request.firstEventType = eventType
      yield compactEvent({
        type: 'modelRequestFirstEvent',
        requestId: request.requestId,
        requestSeq: request.requestSeq,
        reason: request.reason,
        stage: request.stage,
        provider: request.provider,
        model: request.model,
        firstEventType: eventType,
        durationMs: Math.max(0, Date.now() - startedAt),
        timestamp: Date.now(),
      })
    }
    yield event
    lastEventType = eventType
  }
}

function safeUrlHost(value) {
  if (!value) return undefined
  try { return new URL(String(value)).host }
  catch { return undefined }
}

function byteLength(value) {
  const text = String(value || '')
  if (typeof Buffer !== 'undefined') return Buffer.byteLength(text, 'utf8')
  return new TextEncoder().encode(text).length
}

function headerEntries(headers) {
  if (!headers) return []
  if (typeof headers.forEach === 'function') {
    const entries = []
    headers.forEach((value, key) => entries.push([String(key).toLowerCase(), String(value)]))
    return entries
  }
  if (Array.isArray(headers)) {
    return headers.filter(item => Array.isArray(item) && item.length >= 2).map(([key, value]) => [String(key).toLowerCase(), String(value)])
  }
  if (typeof headers === 'object') return Object.entries(headers).map(([key, value]) => [String(key).toLowerCase(), String(value)])
  return []
}

function sanitizeRateLimitHeaders(headers) {
  const out = {}
  for (const [key, value] of headerEntries(headers)) {
    if (key === 'retry-after' || key.includes('ratelimit') || key.includes('rate-limit')) out[key] = String(value)
  }
  return out
}

function parseDurationMs(value) {
  const text = String(value || '').trim().toLowerCase()
  if (!text || /^\d+(?:\.\d+)?$/.test(text)) return undefined
  let total = 0
  let matched = false
  const re = /(\d+(?:\.\d+)?)\s*(ms|s|m|h)\b/g
  let match
  while ((match = re.exec(text))) {
    matched = true
    const n = Number(match[1])
    if (!Number.isFinite(n)) continue
    const unit = match[2]
    if (unit === 'ms') total += n
    else if (unit === 's') total += n * 1000
    else if (unit === 'm') total += n * 60000
    else if (unit === 'h') total += n * 3600000
  }
  return matched ? Math.max(0, total) : undefined
}

function parseResetHeaderMs(value, nowMs = Date.now()) {
  const text = String(value || '').trim()
  if (!text) return undefined
  const duration = parseDurationMs(text)
  if (duration !== undefined) return duration
  const numeric = Number(text)
  if (Number.isFinite(numeric)) {
    if (numeric >= 1000000000000) return Math.max(0, numeric - nowMs)
    if (numeric >= 1000000000) return Math.max(0, numeric * 1000 - nowMs)
    return Math.max(0, numeric * 1000)
  }
  const ts = Date.parse(text)
  return Number.isFinite(ts) ? Math.max(0, ts - nowMs) : undefined
}

function retryAfterMsFromHeaders(headers, nowMs = Date.now()) {
  const candidates = []
  for (const [key, value] of headerEntries(headers)) {
    if (key === 'retry-after') {
      const seconds = Number(value)
      if (Number.isFinite(seconds)) candidates.push(Math.max(0, seconds * 1000))
      else {
        const ts = Date.parse(String(value))
        if (Number.isFinite(ts)) candidates.push(Math.max(0, ts - nowMs))
      }
      continue
    }
    if ((key.includes('ratelimit') || key.includes('rate-limit')) && key.includes('reset')) {
      const delay = parseResetHeaderMs(value, nowMs)
      if (delay !== undefined) candidates.push(delay)
    }
  }
  return candidates.length ? Math.ceil(Math.max(...candidates)) : undefined
}

function gatewayMeta(base = {}, extra = {}) {
  return {
    provider: base.provider,
    model: base.model,
    baseUrl: base.baseUrl,
    apiKey: base.apiKey,
    proxyUrl: base.proxyUrl,
    priority: base.modelGatewayPriority ?? base.priority,
    source: base.modelGatewaySource ?? base.source,
    silent: base.modelGatewaySilent ?? base.silent,
    requestId: base.modelGatewayRequestId ?? base.requestId,
    maxWaitMs: base.modelGatewayMaxWaitMs ?? base.maxWaitMs,
    concurrency: base.modelGatewayConcurrency ?? base.concurrency,
    modelGatewayOnStatus: base.modelGatewayOnStatus,
    ...extra,
  }
}

function normalizeOutputMaxTokens({ outputMaxTokens, maxTokens, provider } = {}) {
  let value = outputMaxTokens ?? maxTokens
  let n = Number(value)
  if (!Number.isFinite(n) || n <= 0) n = DEFAULT_OUTPUT_MAX_TOKENS
  n = Math.floor(n)
  if (provider === 'anthropic') n = Math.min(n, MAX_ANTHROPIC_OUTPUT_TOKENS)
  return n
}

function normalizeAnthropicSystem(system) {
  if (!system) return undefined
  const blocks = Array.isArray(system) ? system : [system]
  const out = []
  for (const block of blocks) {
    if (typeof block === 'string') {
      if (block) out.push({ type: 'text', text: block, cache_control: { type: 'ephemeral' } })
      continue
    }
    if (!block || typeof block !== 'object') continue
    const text = block.text != null ? stringifyPromptText(block.text) : stringifyPromptText(block)
    if (!text) continue
    const normalized = { type: 'text', text }
    if (block.cache_control) normalized.cache_control = block.cache_control
    out.push(normalized)
  }
  return out.length ? out : undefined
}

function limitAnthropicCacheControlBlocks(blocks, maxCacheControlBlocks) {
  if (!Array.isArray(blocks)) return blocks
  let remaining = Math.max(0, Number(maxCacheControlBlocks) || 0)
  const limited = new Array(blocks.length)
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i]
    if (!block || typeof block !== 'object' || !block.cache_control) {
      limited[i] = block
      continue
    }
    if (remaining > 0) {
      remaining--
      limited[i] = block
      continue
    }
    const { cache_control, ...withoutCacheControl } = block
    limited[i] = withoutCacheControl
  }
  return limited
}

function applyAnthropicPromptCaching(body, { system, tools } = {}) {
  const hasTools = Array.isArray(tools) && tools.length > 0
  const toolCacheBlocks = hasTools ? 1 : 0
  const normalizedSystem = normalizeAnthropicSystem(system)
  if (normalizedSystem) {
    body.system = limitAnthropicCacheControlBlocks(
      normalizedSystem,
      MAX_ANTHROPIC_CACHE_CONTROL_BLOCKS - toolCacheBlocks,
    )
  }
  if (hasTools) {
    body.tools = tools.map((tool, index) => {
      const { cache_control, ...withoutCacheControl } = tool
      return index === tools.length - 1
        ? { ...withoutCacheControl, cache_control: { type: 'ephemeral' } }
        : withoutCacheControl
    })
  }
}

function systemToText(system) {
  if (!system) return ''
  if (Array.isArray(system)) {
    return system.map(block => {
      if (typeof block === 'string') return block
      if (block?.text != null) return stringifyPromptText(block.text)
      return stringifyPromptText(block)
    }).filter(Boolean).join('\n\n')
  }
  return stringifyPromptText(system)
}

function prependSystemText(system, text) {
  if (!text) return system
  if (!system) return text
  if (Array.isArray(system)) return [{ type: 'text', text }, ...system]
  return `${text}\n\n${stringifyPromptText(system)}`
}

async function modelFetch(url, fetchOpts = {}, meta = {}) {
  const gateway = globalThis && globalThis.__BRICK_MODEL_GATEWAY__
  if (gateway && typeof gateway.fetch === 'function') return gateway.fetch(url, fetchOpts, { ...meta, url, signal: fetchOpts.signal || meta.signal })
  return fetch(url, fetchOpts)
}

function annotateHttpResponseError(error, response, meta = {}) {
  error.status = response?.status
  return annotateModelError(error, {
    ...meta,
    responseHeaders: response?.headers,
    rateLimitHeaders: sanitizeRateLimitHeaders(response?.headers),
    retryAfterMs: retryAfterMsFromHeaders(response?.headers),
  })
}

function getModelRetryDelayMs(attempt, retryDelayMs, err) {
  if (err?.retryAfterMs != null) {
    const retryAfterMs = Number(err.retryAfterMs)
    if (Number.isFinite(retryAfterMs) && retryAfterMs > 0) return Math.ceil(retryAfterMs)
  }
  if (typeof retryDelayMs === 'function') {
    const ms = Number(retryDelayMs(attempt))
    return Number.isFinite(ms) && ms > 0 ? ms : 0
  }
  const cls = classifyError(err)
  const rateLimit = cls.category === 'rate_limit'
  const baseDefault = rateLimit ? DEFAULT_RATE_LIMIT_RETRY_DELAY_MS : DEFAULT_MODEL_RETRY_DELAY_MS
  const maxDelay = rateLimit ? MAX_RATE_LIMIT_RETRY_DELAY_MS : MAX_MODEL_RETRY_DELAY_MS
  const base = Number.isFinite(Number(retryDelayMs)) ? Number(retryDelayMs) : baseDefault
  if (base <= 0) return 0
  const delay = Math.min(base * Math.pow(2, Math.max(0, attempt - 1)), maxDelay)
  const jitter = Math.floor(Math.random() * Math.min(250, Math.max(1, Math.floor(delay * 0.25))))
  return delay + jitter
}

async function waitForModelRetry(attempt, retryDelayMs, signal, err) {
  const delay = getModelRetryDelayMs(attempt, retryDelayMs, err)
  if (delay <= 0) return
  await new Promise((resolve, reject) => {
    let onAbort
    const cleanup = () => {
      if (signal && onAbort) signal.removeEventListener('abort', onAbort)
    }
    const t = setTimeout(() => {
      cleanup()
      resolve()
    }, delay)
    if (typeof t.unref === 'function') t.unref()
    if (signal) {
      if (signal.aborted) {
        clearTimeout(t)
        cleanup()
        reject(new DOMException('Aborted', 'AbortError'))
        return
      }
      onAbort = () => {
        clearTimeout(t)
        cleanup()
        reject(new DOMException('Aborted', 'AbortError'))
      }
      signal.addEventListener('abort', onAbort, { once: true })
    }
  })
}

const MAX_ROUNDS = 200  // 安全兜底，实际由循环检测控制（与 OpenClaw 一致）
const MAX_CONTINUATIONS = 5
const CONTINUE_PROMPT = 'Continue from where you left off.'

function contentToText(content) {
  if (content == null) return ''
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content.map(part => {
      if (part == null) return ''
      if (typeof part === 'string') return part
      if (typeof part.text === 'string') return part.text
      if (typeof part.content === 'string') return part.content
      return stringifyPromptText(part)
    }).join('')
  }
  return stringifyPromptText(content)
}

function stringifyPromptText(value) {
  if (typeof value === 'string') return value
  if (value === undefined || value === null) return ''
  try {
    const json = JSON.stringify(value)
    if (typeof json === 'string') return json
  } catch {}
  return String(value ?? '')
}

function normalizePromptMessages(history) {
  if (!Array.isArray(history)) return []
  const out = []
  for (const message of history) {
    if (!message || typeof message !== 'object') continue
    const role = stringifyPromptText(message.role).trim()
    if (!role) continue
    if (role === 'assistant') {
      const item = { ...message, role, content: stringifyPromptText(message.content) }
      if (Array.isArray(message.tool_calls)) {
        item.tool_calls = message.tool_calls
          .filter(call => call && (call.id || call.call_id) && (call.name || call.function?.name))
          .map(call => ({
            ...call,
            id: String(call.id || call.call_id),
            name: String(call.name || call.function?.name),
            input: call.input ?? call.arguments ?? call.function?.arguments ?? {},
          }))
      }
      out.push(item)
      continue
    }
    if (role === 'tool') {
      out.push({
        ...message,
        role,
        tool_call_id: stringifyPromptText(message.tool_call_id),
        content: stringifyPromptText(message.content),
      })
      continue
    }
    out.push({ ...message, role, content: stringifyPromptText(message.content) })
  }
  return out
}

// ── agenticAsk: backward-compat wrapper ──
// If emit (3rd arg) is a function → legacy mode, returns Promise<{answer, rounds, messages}>
// Otherwise → generator mode, returns AsyncGenerator<ChatEvent>

function agenticAsk(prompt, config, emit) {
  if (typeof emit === 'function') {
    // Legacy mode: collect events, call emit(), return final result
    return (async () => {
      let answer = ''
      let rounds = 0
      let messages = []
      for await (const event of _agenticAskGen(prompt, config)) {
        // Map new event types to legacy emit calls
        if (event.type === 'text_delta') {
          emit('token', { text: event.text })
        } else if (event.type === 'tool_use') {
          emit('tool', { name: event.name, input: event.input })
        } else if (event.type === 'warning') {
          emit('warning', { level: event.level, message: event.message })
        } else {
          emit(event.type, event)
        }
        if (event.type === 'done') {
          answer = event.answer
          rounds = event.rounds
          messages = event.messages || []
        }
      }
      return { answer, rounds, messages }
    })()
  }
  // Generator mode
  return _agenticAskGen(prompt, config)
}

// ── Custom provider registry ──

const _customProviders = new Map()

function registerProvider(name, chatFn) {
  _customProviders.set(name, chatFn)
}

function unregisterProvider(name) {
  _customProviders.delete(name)
}

// ── Provider failover ──

async function _callWithFailover(opts) {
  const { messages, tools, model, baseUrl, apiKey, proxyUrl, stream, system, provider, signal, providers, outputMaxTokens, maxTokens } = opts
  const providerList = (providers && providers.length) ? providers : [{ provider, apiKey, baseUrl, model, proxyUrl }]

  let lastErr
  for (let i = 0; i < providerList.length; i++) {
    const p = providerList[i]
    const prov = p.provider || provider
    const custom = _customProviders.get(prov)
    const chatFn = custom || (
      prov === 'anthropic' ? anthropicChat
      : prov === 'openai-responses' ? openaiResponsesChat
      : openaiChat
    )
    try {
      return await chatFn({
        messages, tools,
        model: p.model || model,
        baseUrl: p.baseUrl || baseUrl,
        apiKey: p.apiKey || apiKey,
        proxyUrl: p.proxyUrl || proxyUrl,
        stream, emit: function noop(){}, system, signal, outputMaxTokens, maxTokens,
        onToolReady: opts.onToolReady,
        modelGatewayPriority: opts.modelGatewayPriority,
        modelGatewaySource: opts.modelGatewaySource,
        modelGatewaySilent: opts.modelGatewaySilent,
        modelGatewayRequestId: opts.modelGatewayRequestId,
        modelGatewayMaxWaitMs: opts.modelGatewayMaxWaitMs,
        modelGatewayConcurrency: opts.modelGatewayConcurrency,
        modelGatewayOnStatus: opts.modelGatewayOnStatus,
      })
    } catch (err) {
      lastErr = annotateModelError(err, {
        provider: prov,
        model: p.model || model,
        baseUrl: p.baseUrl || baseUrl,
      })
      // Don't try next provider if already aborted
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      if (i < providerList.length - 1) continue
      throw lastErr
    }
  }
  throw lastErr
}

/**
 * Streaming version of _callWithFailover.
 * Yields { type: 'text_delta', text } and { type: 'tool_ready', toolCall } events,
 * then yields { type: 'response', content, tool_calls, stop_reason } at the end.
 */
async function* _streamCallWithFailover(opts) {
  const { messages, tools, model, baseUrl, apiKey, proxyUrl, system, provider, signal, providers, outputMaxTokens, maxTokens } = opts
  const providerList = (providers && providers.length) ? providers : [{ provider, apiKey, baseUrl, model, proxyUrl }]

  let lastErr
  for (let i = 0; i < providerList.length; i++) {
    const p = providerList[i]
    const prov = p.provider || provider
    const pModel = p.model || model
    const pBaseUrl = p.baseUrl || baseUrl
    const pApiKey = p.apiKey || apiKey
    const pProxyUrl = p.proxyUrl || proxyUrl

    // Custom providers: support both async generator (streaming) and plain async (non-streaming)
    const custom = _customProviders.get(prov)
    if (custom) {
      try {
        const result = custom({ messages, tools, model: pModel, baseUrl: pBaseUrl, apiKey: pApiKey, proxyUrl: pProxyUrl, stream: true, emit: function noop(){}, system, signal, outputMaxTokens, maxTokens })
        if (result && typeof result[Symbol.asyncIterator] === 'function') {
          // Streaming custom provider
          let content = ''; const tool_calls = []
          for await (const chunk of result) {
            if (chunk.type === 'text_delta' || chunk.type === 'content') {
              const text = chunk.text || ''
              content += text
              yield { type: 'text_delta', text }
            } else if (chunk.type === 'tool_use') {
              tool_calls.push(chunk)
              yield chunk
            }
          }
          yield { type: 'response', content, tool_calls, stop_reason: tool_calls.length ? 'tool_use' : 'end_turn' }
        } else {
          // Non-streaming custom provider
          const response = await result
          if (response.content) yield { type: 'text_delta', text: response.content }
          yield { type: 'response', content: response.content, tool_calls: response.tool_calls || [], stop_reason: response.stop_reason }
        }
        return
      } catch (err) { lastErr = annotateModelError(err, { provider: prov, model: pModel, baseUrl: pBaseUrl }); if (signal?.aborted) throw new DOMException('Aborted', 'AbortError'); if (i < providerList.length - 1) continue; throw lastErr }
    }

    let url, requestBytes
    try {
      const isAnthropic = prov === 'anthropic'
      const base = (pBaseUrl || (isAnthropic ? 'https://api.anthropic.com' : 'https://api.openai.com')).replace(/\/+$/, '')

      let headers, body
      if (isAnthropic) {
        url = base.endsWith('/v1') ? `${base}/messages` : `${base}/v1/messages`
        headers = { 'content-type': 'application/json', 'x-api-key': pApiKey, 'anthropic-version': '2023-06-01' }
        // Build Anthropic messages format (handles multimodal tool_result blocks)
        const anthropicMessages = buildAnthropicMessages(messages)
        body = {
          model: pModel || 'claude-sonnet-4',
          max_tokens: normalizeOutputMaxTokens({ outputMaxTokens, maxTokens, provider: 'anthropic' }),
          messages: anthropicMessages,
          stream: true,
        }
        applyAnthropicPromptCaching(body, { system, tools })
        // Enable prompt caching beta
        headers['anthropic-beta'] = 'prompt-caching-2024-07-31'
        if (pProxyUrl) { headers = { ...headers, 'x-base-url': pBaseUrl || 'https://api.anthropic.com', 'x-provider': 'anthropic' }; url = pProxyUrl }
      } else if (prov === 'openai-responses') {
        url = base.includes('/v1') ? `${base}/responses` : `${base}/v1/responses`
        headers = { 'content-type': 'application/json', 'authorization': `Bearer ${pApiKey}` }
        const input = buildOpenAIResponsesInput(messages)
        body = { model: pModel || 'gpt-4.1-mini', input, stream: true }
        const instructions = systemToText(system)
        if (instructions) body.instructions = instructions
        if (tools?.length) {
          body.tools = tools.map(t => ({ type: 'function', name: t.name, description: t.description, parameters: t.input_schema || t.parameters }))
          body.tool_choice = 'auto'
        }
        if (pProxyUrl) { headers['x-base-url'] = pBaseUrl || 'https://api.openai.com'; headers['x-provider'] = 'openai-responses'; url = pProxyUrl }
      } else {
        url = base.includes('/v1') ? `${base}/chat/completions` : `${base}/v1/chat/completions`
        headers = { 'content-type': 'application/json', 'authorization': `Bearer ${pApiKey}` }
        const oaiMessages = buildOpenAIMessages(messages, systemToText(system))
        body = { model: pModel || 'gpt-4', messages: oaiMessages, stream: true }
        if (tools?.length) {
          body.tools = tools.map(t => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.input_schema } })); body.tool_choice = 'auto'
        }
        if (pProxyUrl) { headers['x-base-url'] = pBaseUrl || 'https://api.openai.com'; headers['x-provider'] = 'openai'; url = pProxyUrl }
      }

      // Use the appropriate generator
      const isResponses = prov === 'openai-responses'
      requestBytes = byteLength(JSON.stringify(body))
      const meta = gatewayMeta(opts, { provider: prov, model: pModel, baseUrl: pBaseUrl, apiKey: pApiKey, proxyUrl: pProxyUrl, url, requestBytes })
      const gen = isAnthropic ? _streamAnthropicGen(url, headers, body, signal, meta)
        : isResponses ? _streamOpenAIResponsesGen(url, headers, body, signal, meta)
        : _streamOpenAIGen(url, headers, body, signal, meta)

      let content = '', toolCalls = [], stopReason = 'end_turn'
      const oaiToolMap = {} // for OpenAI incremental tool_delta assembly

      for await (const evt of gen) {
        if (evt.type === 'text_delta') {
          content += evt.text
          yield evt
        } else if (evt.type === 'tool_input_delta') {
          yield evt
        } else if (evt.type === 'tool_ready') {
          // Anthropic: complete tool call
          toolCalls.push(evt.toolCall)
          yield evt
        } else if (evt.type === 'tool_delta') {
          // OpenAI: incremental tool call assembly
          const td = evt.toolDelta
          if (!oaiToolMap[td.index]) oaiToolMap[td.index] = { id: '', name: '', arguments: '' }
          if (td.id) oaiToolMap[td.index].id = td.id
          if (td.name) oaiToolMap[td.index].name = td.name
          if (td.arguments) oaiToolMap[td.index].arguments += td.arguments
        } else if (evt.type === 'stop') {
          stopReason = evt.stop_reason
        } else if (evt.type === 'usage') {
          yield evt
        }
      }

      // Finalize OpenAI tool calls
      if (Object.keys(oaiToolMap).length) {
        for (const t of Object.values(oaiToolMap)) {
          if (!t.name) continue
          let input = {}; try { input = JSON.parse(t.arguments || '{}') } catch {}
          const tc = { id: t.id, name: t.name, input }
          toolCalls.push(tc)
          yield { type: 'tool_ready', toolCall: tc }
        }
      }

      yield { type: 'response', content, tool_calls: toolCalls, stop_reason: stopReason }
      return
    } catch (err) {
      lastErr = annotateModelError(err, {
        provider: prov,
        model: pModel,
        baseUrl: pBaseUrl,
        url,
        requestBytes,
      })
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      if (i < providerList.length - 1) continue
      throw lastErr
    }
  }
  throw lastErr
}

// ── Core async generator ──

async function transformToolPromptContent(transformToolContent, args) {
  if (typeof transformToolContent !== 'function') return args.content
  const transformed = await transformToolContent(args)
  return typeof transformed === 'string' ? transformed : String(transformed ?? '')
}

function blocksForTransformedToolContent(blocks, rawContent, content) {
  if (content === rawContent || !Array.isArray(blocks) || !blocks.length) return blocks
  if (!blocks.every(block => block?.type === 'text')) return blocks
  return [{ type: 'text', text: content }]
}

async function* _agenticAskGen(prompt, config) {
  const { provider = 'anthropic', baseUrl, apiKey, model, tools = ['search', 'code'], searchApiKey, history, proxyUrl, stream = true, schema, retries = DEFAULT_MODEL_RETRIES, retryDelayMs = DEFAULT_MODEL_RETRY_DELAY_MS, system, images, audio, signal, providers, outputMaxTokens, maxTokens, steer, transformToolContent, modelRequestLifecycle = false, modelRequestFirstEventTimeoutMs = 0, modelStreamIdleTimeoutMs = 0, modelGatewayPriority, modelGatewaySource, modelGatewaySilent, modelGatewayRequestId, modelGatewayMaxWaitMs, modelGatewayConcurrency, modelGatewayOnStatus } = config
  const promptText = stringifyPromptText(prompt)
  const modelGateway = { modelGatewayPriority, modelGatewaySource, modelGatewaySilent, modelGatewayRequestId, modelGatewayMaxWaitMs, modelGatewayConcurrency, modelGatewayOnStatus }
  const modelRequestLifecycleEnabled = modelRequestLifecycle === true
    || Number(modelRequestFirstEventTimeoutMs) > 0
    || Number(modelStreamIdleTimeoutMs) > 0
  let modelRequestSeq = 0
  let nextModelRequestReason = 'initial'
  const nextModelRequest = (reason) => createModelRequest({
    requestSeq: ++modelRequestSeq,
    reason: reason || nextModelRequestReason || 'initial',
    provider,
    model,
  })
  const modelRequestTimeouts = { firstEventTimeoutMs: modelRequestFirstEventTimeoutMs, streamIdleTimeoutMs: modelStreamIdleTimeoutMs }
  const normalizedSystem = Array.isArray(system) ? system : systemToText(system)

  if (!apiKey && (!providers || !providers.length)) throw new Error('API Key required')

  // Schema mode
  if (schema) {
    const result = await schemaAsk(promptText, { ...config, system: normalizedSystem }, function noop(){})
    yield { type: 'done', answer: result.answer, rounds: 1, stopReason: 'end_turn', messages: [] }
    return
  }

  const { defs: toolDefs, customTools } = buildToolDefs(tools)

  // Build messages
  const messages = []
  if (history?.length) {
    messages.push(...normalizePromptMessages(history))
  }

  // Build user message — support vision (images) and audio
  if (images?.length || audio) {
    const content = []
    if (images?.length) {
      for (const img of images) {
        if (provider === 'anthropic') {
          content.push({ type: 'image', source: { type: 'base64', media_type: img.media_type || 'image/jpeg', data: img.data } })
        } else {
          const url = img.url || `data:${img.media_type || 'image/jpeg'};base64,${img.data}`
          content.push({ type: 'image_url', image_url: { url, detail: img.detail || 'low' } })
        }
      }
    }
    if (audio) {
      if (provider === 'anthropic') {
        console.warn('[agenticAsk] Anthropic does not support audio input')
      } else {
        content.push({ type: 'input_audio', input_audio: { data: audio.data, format: audio.format || 'wav' } })
      }
    }
    content.push({ type: 'text', text: promptText })
    messages.push({ role: 'user', content })
  } else {
    messages.push({ role: 'user', content: promptText })
  }

  let round = 0
  let finalAnswer = null
  let finalAnswerReady = false
  let continuationCount = 0
  let continuedAnswer = ''
  const state = { toolCallHistory: [] }

  // Abort-aware promise helper: races any promise against the abort signal.
  // When signal fires, the returned promise rejects with AbortError immediately.
  function raceAbort(promise) {
    if (!signal) return promise
    if (signal.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'))
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
      }),
    ])
  }

  const t_start = Date.now()

  console.log('[agenticAsk] Starting with prompt:', promptText.slice(0, 50))
  console.log('[agenticAsk] Tools available:', tools, 'Stream:', stream)
  console.log('[agenticAsk] Provider:', provider)

  // Eager execution hint at core level: prepend to system when tools are available
  const eagerEnabled = toolDefs.length > 0
  const effectiveSystem = eagerEnabled
    ? prependSystemText(normalizedSystem, EAGER_HINT)
    : normalizedSystem
  const maxModelRetries = normalizeRetryCount(retries)

  yield { type: 'config', eager: eagerEnabled, tools: toolDefs.length, provider }

  while (round < MAX_ROUNDS) {
    round++

    // Check abort signal
    if (signal && signal.aborted) {
      yield { type: 'error', error: 'aborted', category: 'network', retryable: false }
      return
    }

    // ── Turn-boundary steering injection ──
    // Caller supplies steer.drain() returning queued user messages to inject
    // before the next LLM call. Each item may be a string or { content, ... }.
    // This is the single hook that turns agenticAsk into a steerable loop.
    if (steer && typeof steer.drain === 'function') {
      let queued
      queued = await drainSteerQueue(steer)
      if (queued && queued.length) {
          const injected = []
          for (const item of queued) {
            if (item == null) continue
          const text = typeof item === 'string' ? item : stringifyPromptText(item.content ?? item)
          if (!text) continue
          messages.push({ role: 'user', content: text })
          injected.push(text)
        }
        if (injected.length) {
          yield { type: 'steered', round, count: injected.length, messages: injected }
          if (typeof steer.onInjected === 'function') {
            try { steer.onInjected({ round, messages: injected }) } catch {}
          }
        }
      }
    }

    const t_round = Date.now()
    let t_firstToken = 0
    console.log(`\n[Round ${round}] Calling LLM...`)
    yield { type: 'status', message: `Round ${round}/${MAX_ROUNDS}` }

    const isStreamRound = stream && (provider === 'anthropic' || provider === 'openai-responses' || !toolDefs.length || round > 1)
    let response

    // Eager tool execution: start tools as soon as LLM finishes each tool_use block
    const eagerResults = new Map() // toolCallId → Promise<result>

    if (isStreamRound) {
      // True streaming path — yield text_delta tokens as they arrive
      let attempt = 0
      while (true) {
        let progressed = false
        try {
          const request = modelRequestLifecycleEnabled ? nextModelRequest() : null
          const streamGen = _streamCallWithFailover({ messages, tools: toolDefs, model, baseUrl, apiKey, proxyUrl, system: effectiveSystem, provider, signal, providers, outputMaxTokens, maxTokens, ...modelGateway })
          const requestGen = modelRequestLifecycleEnabled ? runModelRequest(streamGen, request, modelRequestTimeouts) : streamGen
          for await (const evt of requestGen) {
            if (isModelRequestEventType(evt.type)) {
              yield evt
            } else if (evt.type === 'text_delta') {
              progressed = true
              if (!t_firstToken) t_firstToken = Date.now()
              yield evt // Forward token-level events to consumer
            } else if (evt.type === 'tool_input_delta') {
              progressed = true
              yield evt // Forward tool argument streaming to consumer
            } else if (evt.type === 'tool_ready') {
              progressed = true
              // Start eager tool execution
              const toolCall = evt.toolCall
              const contractError = validateToolCallContract(toolCall, { customTools, toolDefs })
              if (contractError) continue
              const promise = (async () => {
                const t0 = Date.now()
                try {
                  const result = await executeTool(toolCall.name, toolCall.input, { searchApiKey, customTools, signal })
                  return { call: toolCall, result, error: null, ms: Date.now() - t0 }
                } catch (err) {
                  return { call: toolCall, result: null, error: err.message || String(err), ms: Date.now() - t0 }
                }
              })()
              eagerResults.set(toolCall.id, promise)
            } else if (evt.type === 'response') {
              response = evt
            }
          }
          nextModelRequestReason = 'initial'
          break
        } catch (err) {
          const cls = classifyError(err)
          if (!progressed && !isAbortError(err, signal) && cls.retryable && attempt < maxModelRetries) {
            attempt++
            console.warn(`[agenticAsk] LLM ${cls.category} error: ${err.message}. Retry ${attempt}/${maxModelRetries}`)
            yield { type: 'status', message: `Retrying model request (${attempt}/${maxModelRetries})`, category: cls.category, retryable: true, attempt }
            await waitForModelRetry(attempt, retryDelayMs, signal, err)
            continue
          }
          yield modelErrorEvent(err, cls, attempt, maxModelRetries)
          return
        }
      }
    } else {
      // Non-streaming path — await complete response
      let attempt = 0
      while (true) {
        let request
        try {
          request = modelRequestLifecycleEnabled ? nextModelRequest() : null
          const startedAt = Date.now()
          if (request) yield request
          response = request
            ? await timeoutRace(raceAbort(_callWithFailover({ messages, tools: toolDefs, model, baseUrl, apiKey, proxyUrl, stream: false, system: effectiveSystem, provider, signal, providers, outputMaxTokens, maxTokens, ...modelGateway })), { request, timeoutMs: modelRequestFirstEventTimeoutMs, kind: 'first_event' })
            : await raceAbort(_callWithFailover({ messages, tools: toolDefs, model, baseUrl, apiKey, proxyUrl, stream: false, system: effectiveSystem, provider, signal, providers, outputMaxTokens, maxTokens, ...modelGateway }))
          if (request) {
            request.firstEventType = 'response'
            yield compactEvent({ type: 'modelRequestFirstEvent', requestId: request.requestId, requestSeq: request.requestSeq, reason: request.reason, stage: request.stage, provider: request.provider, model: request.model, firstEventType: 'response', durationMs: Math.max(0, Date.now() - startedAt), timestamp: Date.now() })
            yield compactEvent({ type: 'modelRequestEnd', requestId: request.requestId, requestSeq: request.requestSeq, reason: request.reason, stage: request.stage, provider: request.provider, model: request.model, firstEventType: 'response', outcome: 'response', durationMs: Math.max(0, Date.now() - startedAt), timestamp: Date.now() })
          }
          nextModelRequestReason = 'initial'
          break
        } catch (err) {
          if (request) {
            const timeout = err?.code === MODEL_REQUEST_FIRST_EVENT_TIMEOUT || err?.code === MODEL_STREAM_IDLE_TIMEOUT
            yield compactEvent({
              type: timeout ? 'modelRequestTimeout' : 'modelRequestError',
              requestId: request.requestId,
              requestSeq: request.requestSeq,
              reason: request.reason,
              stage: request.stage,
              provider: request.provider,
              model: request.model,
              errorType: err?.code || err?.name || 'model_request_failed',
              errorMessage: err?.message || String(err),
              timeoutMs: err?.timeoutMs,
              timestamp: Date.now(),
            })
          }
          const cls = classifyError(err)
          if (!isAbortError(err, signal) && cls.retryable && attempt < maxModelRetries) {
            attempt++
            console.warn(`[agenticAsk] LLM ${cls.category} error: ${err.message}. Retry ${attempt}/${maxModelRetries}`)
            yield { type: 'status', message: `Retrying model request (${attempt}/${maxModelRetries})`, category: cls.category, retryable: true, attempt }
            await waitForModelRetry(attempt, retryDelayMs, signal, err)
            continue
          }
          yield modelErrorEvent(err, cls, attempt, maxModelRetries)
          return
        }
      }
      // Yield text content as text_delta (single chunk for non-streaming)
      if (response.content) {
        t_firstToken = Date.now()
        yield { type: 'text_delta', text: response.content }
      }
    }

    const t_llmDone = Date.now()
    const llmMs = t_llmDone - t_round
    const ttftMs = t_firstToken ? t_firstToken - t_round : null
    console.log(`[Round ${round}] LLM done in ${llmMs}ms (TTFT: ${ttftMs ?? 'n/a'}ms)`)
    yield { type: 'timing', round, phase: 'llm', ms: llmMs, ttft: ttftMs }
    console.log(`[Round ${round}] LLM Response:`)
    console.log(`  - stop_reason: ${response.stop_reason}`)
    console.log(`  - content:`, response.content)
    console.log(`  - tool_calls: ${response.tool_calls?.length || 0}`)

    const toolCallCount = response.tool_calls?.length || 0

    if (response.stop_reason === 'max_tokens' && toolCallCount === 0) {
      const content = response.content ?? ''
      continuedAnswer += contentToText(content)

      if (continuationCount < MAX_CONTINUATIONS) {
        continuationCount++
        messages.push({ role: 'assistant', content })
        messages.push({ role: 'user', content: CONTINUE_PROMPT })
        console.log(`[Round ${round}] Output truncated by max_tokens; continuing (${continuationCount}/${MAX_CONTINUATIONS})`)
        nextModelRequestReason = 'continuation'
        continue
      }

      console.log(`[Round ${round}] Output still truncated after ${MAX_CONTINUATIONS} continuation(s); returning accumulated content`)
      finalAnswer = continuedAnswer
      finalAnswerReady = true
      break
    }

    // Check if done
    if (['end_turn', 'stop'].includes(response.stop_reason) || !toolCallCount) {
      // Before breaking, check if there are steered messages waiting.
      // If so, inject them and continue the loop instead of exiting.
      if (steer && typeof steer.drain === 'function') {
        let lateQueued
        lateQueued = await drainSteerQueue(steer)
        if (lateQueued && lateQueued.length) {
          // Push the assistant's current answer, then inject user messages
          messages.push({ role: 'assistant', content: response.content })
          const injected = []
          for (const item of lateQueued) {
            if (item == null) continue
            const text = typeof item === 'string' ? item : (item.content ?? '')
            if (!text) continue
            messages.push({ role: 'user', content: text })
            injected.push(text)
          }
          if (injected.length) {
            continuedAnswer = ''
            continuationCount = 0
            yield { type: 'steered', round, count: injected.length, messages: injected }
            if (typeof steer.onInjected === 'function') {
              try { steer.onInjected({ round, messages: injected }) } catch {}
            }
            console.log(`[Round ${round}] Steered ${injected.length} message(s) at end_turn, continuing loop`)
            nextModelRequestReason = 'steer'
            continue // back to top of while loop for another LLM call
          }
        }
      }
      console.log(`[Round ${round}] Done: stop_reason=${response.stop_reason}, tool_calls=${toolCallCount}`)
      if (continuationCount > 0) {
        finalAnswer = continuedAnswer + contentToText(response.content)
        finalAnswerReady = true
      } else {
        finalAnswer = response.content
        finalAnswerReady = Boolean(finalAnswer)
      }
      break
    }

    // Execute tools
    console.log(`[Round ${round}] Executing ${response.tool_calls.length} tool calls...`)

    messages.push({ role: 'assistant', content: response.content, tool_calls: response.tool_calls })

    // Pre-check: abort signal + loop detection
    if (signal && signal.aborted) {
      yield { type: 'error', error: 'aborted', category: 'network', retryable: false }
      return
    }

    const validCalls = []
    for (const call of response.tool_calls) {
      recordToolCall(state, call.name, call.input)
      const loopDetection = detectToolCallLoop(state, call.name, call.input)
      if (loopDetection.stuck) {
        console.log(`[Round ${round}] Loop detected: ${loopDetection.detector} (${loopDetection.level})`)
        yield { type: 'warning', level: loopDetection.level, message: loopDetection.message }
        if (loopDetection.level === 'critical') {
          finalAnswer = `[Loop Detection] ${loopDetection.message}`
          finalAnswerReady = true
          break
        }
        messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify({ error: `LOOP_DETECTED: ${loopDetection.message}` }) })
      } else {
        validCalls.push(call)
      }
    }

    if (!finalAnswer && validCalls.length) {
      // Emit all tool_use events upfront
      for (const call of validCalls) {
        yield { type: 'tool_use', id: call.id, name: call.name, input: call.input }
      }

      const t0 = Date.now()

      // Collect yielded events from streaming tools
      const streamEvents = []

      // Eager execution: tools already started during LLM streaming?
      const hasEager = eagerResults.size > 0
      if (hasEager) {
        console.log(`[Round ${round}] ${eagerResults.size}/${validCalls.length} tools started eagerly during LLM stream`)
      }

      let results
      try {
        results = await raceAbort(Promise.all(validCalls.map(async (call) => {
          try {
            // Use eager result if available, otherwise execute now
            let result
            if (eagerResults.has(call.id)) {
              const eager = await eagerResults.get(call.id)
              recordToolCallOutcome(state, call.name, call.input, eager.result, eager.error)
              return eager
            }

            result = await executeTool(call.name, call.input, { searchApiKey, customTools, signal })

            // Streaming tool: async generator → collect progress, return final
            if (result && typeof result[Symbol.asyncIterator] === 'function') {
              let finalResult = null
              for await (const delta of result) {
                if (signal?.aborted) break
                if (delta._final) {
                  finalResult = delta.result ?? delta
                } else {
                  streamEvents.push({ type: 'tool_progress', id: call.id, name: call.name, delta })
                }
              }
              const out = finalResult ?? { streamed: true }
              recordToolCallOutcome(state, call.name, call.input, out, null)
              return { call, result: out, error: null }
            }

            recordToolCallOutcome(state, call.name, call.input, result, null)
            return { call, result, error: null }
          } catch (toolErr) {
            const errMsg = toolErr instanceof Error ? toolErr.message : String(toolErr)
            recordToolCallOutcome(state, call.name, call.input, null, errMsg)
            return { call, result: null, error: errMsg }
          }
        })))
      } catch (abortErr) {
        if (abortErr?.name === 'AbortError') {
          console.log(`[Round ${round}] Aborted during tool execution`)
          yield { type: 'error', error: 'aborted', category: 'network', retryable: false }
          return
        }
        throw abortErr
      }
      console.log(`[Round ${round}] All ${validCalls.length} tools done in ${Date.now() - t0}ms${hasEager ? ' (eager+parallel)' : ' (parallel)'}`)

      // Yield timing event for this round
      const toolMs = Date.now() - t0
      yield { type: 'timing', round, phase: 'tools', ms: toolMs, eager: hasEager, count: validCalls.length }

      // Yield streaming tool progress events
      for (const evt of streamEvents) {
        yield evt
      }

      // Push results in original order + yield events
      for (const { call, result, error } of results) {
        if (error) {
          const { blocks, is_error } = await normalizeToolResultBlocks({ error })
          const rawContent = JSON.stringify({ error })
          const content = await transformToolPromptContent(transformToolContent, { id: call.id, name: call.name, content: rawContent })
          const promptBlocks = blocksForTransformedToolContent(blocks, rawContent, content)
          messages.push({ role: 'tool', tool_call_id: call.id, blocks: promptBlocks, is_error: is_error || true, content })
          yield { type: 'tool_error', id: call.id, name: call.name, error }
        } else {
          const { blocks, is_error } = await normalizeToolResultBlocks(result)
          const rawContent = JSON.stringify(result)
          const content = await transformToolPromptContent(transformToolContent, { id: call.id, name: call.name, content: rawContent })
          const promptBlocks = blocksForTransformedToolContent(blocks, rawContent, content)
          messages.push({ role: 'tool', tool_call_id: call.id, blocks: promptBlocks, is_error, content })
          yield { type: 'tool_result', id: call.id, name: call.name, output: result, blocks }
        }
      }
      if (results?.length) nextModelRequestReason = 'after_tool'
    }

    if (finalAnswer) break
  }

  console.log(`\n[agenticAsk] Loop ended at round ${round}`)

  if (!finalAnswerReady && !finalAnswer) {
    console.log('[agenticAsk] Generating final answer (no tools)...')
    yield { type: 'status', message: 'Generating final answer...' }
    if (stream) {
      // Stream the final answer too. Retry only before any final-answer text
      // has been emitted, so consumers never see duplicated tokens.
      let attempt = 0
      while (true) {
        let content = ''
        let progressed = false
        try {
          const request = modelRequestLifecycleEnabled ? nextModelRequest('final_answer') : null
          const streamGen = _streamCallWithFailover({ messages, tools: [], model, baseUrl, apiKey, proxyUrl, system, provider, signal, providers, outputMaxTokens, maxTokens, ...modelGateway })
          const requestGen = modelRequestLifecycleEnabled ? runModelRequest(streamGen, request, modelRequestTimeouts) : streamGen
          for await (const evt of requestGen) {
            if (isModelRequestEventType(evt.type)) {
              yield evt
            } else if (evt.type === 'text_delta') {
              progressed = true
              content += evt.text
              yield evt
            }
            else if (evt.type === 'response') { /* done */ }
          }
          finalAnswer = content || '(no response)'
          finalAnswerReady = true
          break
        } catch (err) {
          const cls = classifyError(err)
          if (!progressed && !isAbortError(err, signal) && cls.retryable && attempt < maxModelRetries) {
            attempt++
            console.warn(`[agenticAsk] final LLM ${cls.category} error: ${err.message}. Retry ${attempt}/${maxModelRetries}`)
            yield { type: 'status', message: `Retrying model request (${attempt}/${maxModelRetries})`, category: cls.category, retryable: true, attempt }
            await waitForModelRetry(attempt, retryDelayMs, signal, err)
            continue
          }
          yield modelErrorEvent(err, cls, attempt, maxModelRetries)
          return
        }
      }
    } else {
      let attempt = 0
      while (true) {
        let request
        try {
          request = modelRequestLifecycleEnabled ? nextModelRequest('final_answer') : null
          const startedAt = Date.now()
          if (request) yield request
          const finalResponse = request
            ? await timeoutRace(raceAbort(_callWithFailover({ messages, tools: [], model, baseUrl, apiKey, proxyUrl, stream: false, system, provider, signal, providers, outputMaxTokens, maxTokens, ...modelGateway })), { request, timeoutMs: modelRequestFirstEventTimeoutMs, kind: 'first_event' })
            : await raceAbort(_callWithFailover({ messages, tools: [], model, baseUrl, apiKey, proxyUrl, stream: false, system, provider, signal, providers, outputMaxTokens, maxTokens, ...modelGateway }))
          if (request) {
            request.firstEventType = 'response'
            yield compactEvent({ type: 'modelRequestFirstEvent', requestId: request.requestId, requestSeq: request.requestSeq, reason: request.reason, stage: request.stage, provider: request.provider, model: request.model, firstEventType: 'response', durationMs: Math.max(0, Date.now() - startedAt), timestamp: Date.now() })
            yield compactEvent({ type: 'modelRequestEnd', requestId: request.requestId, requestSeq: request.requestSeq, reason: request.reason, stage: request.stage, provider: request.provider, model: request.model, firstEventType: 'response', outcome: 'response', durationMs: Math.max(0, Date.now() - startedAt), timestamp: Date.now() })
          }
          finalAnswer = finalResponse.content || '(no response)'
          finalAnswerReady = true
          break
        } catch (err) {
          if (request) {
            const timeout = err?.code === MODEL_REQUEST_FIRST_EVENT_TIMEOUT || err?.code === MODEL_STREAM_IDLE_TIMEOUT
            yield compactEvent({
              type: timeout ? 'modelRequestTimeout' : 'modelRequestError',
              requestId: request.requestId,
              requestSeq: request.requestSeq,
              reason: request.reason,
              stage: request.stage,
              provider: request.provider,
              model: request.model,
              errorType: err?.code || err?.name || 'model_request_failed',
              errorMessage: err?.message || String(err),
              timeoutMs: err?.timeoutMs,
              timestamp: Date.now(),
            })
          }
          const cls = classifyError(err)
          if (!isAbortError(err, signal) && cls.retryable && attempt < maxModelRetries) {
            attempt++
            console.warn(`[agenticAsk] final LLM ${cls.category} error: ${err.message}. Retry ${attempt}/${maxModelRetries}`)
            yield { type: 'status', message: `Retrying model request (${attempt}/${maxModelRetries})`, category: cls.category, retryable: true, attempt }
            await waitForModelRetry(attempt, retryDelayMs, signal, err)
            continue
          }
          yield modelErrorEvent(err, cls, attempt, maxModelRetries)
          return
        }
      }
    }
    console.log('[agenticAsk] Final answer:', finalAnswer.slice(0, 100))
  }

  console.log('[agenticAsk] Complete. Total rounds:', round, 'Total time:', Date.now() - t_start, 'ms')
  yield { type: 'done', answer: finalAnswer, rounds: round, stopReason: 'end_turn', messages, totalMs: Date.now() - t_start }
}

// ── LLM Chat Functions ──

async function anthropicChat({ messages, tools, model = 'claude-sonnet-4', baseUrl = 'https://api.anthropic.com', apiKey, proxyUrl, stream = false, emit, system, signal, onToolReady, outputMaxTokens, maxTokens, modelGatewayPriority, modelGatewaySource, modelGatewaySilent, modelGatewayRequestId, modelGatewayMaxWaitMs, modelGatewayConcurrency, modelGatewayOnStatus }) {
  const base = baseUrl.replace(/\/+$/, '')
  const url = base.endsWith('/v1') ? `${base}/messages` : `${base}/v1/messages`
  const baseMeta = { provider: 'anthropic', model, baseUrl, apiKey, proxyUrl, modelGatewayPriority, modelGatewaySource, modelGatewaySilent, modelGatewayRequestId, modelGatewayMaxWaitMs, modelGatewayConcurrency, modelGatewayOnStatus }

  // Convert messages to Anthropic format (handles multimodal tool_result blocks + companion user messages)
  const anthropicMessages = buildAnthropicMessages(messages)

  const body = {
    model,
    max_tokens: normalizeOutputMaxTokens({ outputMaxTokens, maxTokens, provider: 'anthropic' }),
    messages: anthropicMessages,
    stream,
  }
  const headers = { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }

  // Enable prompt caching for system + tools (Anthropic beta)
  if (system || tools?.length) {
    headers['anthropic-beta'] = 'prompt-caching-2024-07-31'
  }

  applyAnthropicPromptCaching(body, { system, tools })

  if (stream && !proxyUrl) {
    // Stream mode — direct SSE
    return await streamAnthropic(url, headers, body, emit, signal, onToolReady, gatewayMeta(baseMeta, { url, requestBytes: byteLength(JSON.stringify(body)) }))
  }

  if (stream && proxyUrl) {
    // Stream via transparent proxy (Vercel Edge / similar)
    // Send stream:true request through proxy with custom headers
    const proxyHeaders = { ...headers, 'x-base-url': baseUrl || 'https://api.anthropic.com', 'x-provider': 'anthropic' }
    return await streamAnthropic(proxyUrl, proxyHeaders, body, emit, signal, onToolReady, gatewayMeta(baseMeta, { url: proxyUrl, baseUrl, requestBytes: byteLength(JSON.stringify(body)) }))
  }

  const response = await callLLM(url, apiKey, body, proxyUrl, true, signal, baseMeta)
  
  const text = response.content.find(c => c.type === 'text')?.text || ''
  
  return {
    content: text,
    tool_calls: response.content.filter(c => c.type === 'tool_use').map(t => ({
      id: t.id, name: t.name, input: t.input
    })),
    stop_reason: response.stop_reason
  }
}

async function openaiChat({ messages, tools, model = 'gpt-4', baseUrl = 'https://api.openai.com', apiKey, proxyUrl, stream = false, emit, system, signal, onToolReady, modelGatewayPriority, modelGatewaySource, modelGatewaySilent, modelGatewayRequestId, modelGatewayMaxWaitMs, modelGatewayConcurrency, modelGatewayOnStatus }) {
  const base = baseUrl.replace(/\/+$/, '')
  const url = base.includes('/v1') ? `${base}/chat/completions` : `${base}/v1/chat/completions`
  const baseMeta = { provider: 'openai', model, baseUrl, apiKey, proxyUrl, modelGatewayPriority, modelGatewaySource, modelGatewaySilent, modelGatewayRequestId, modelGatewayMaxWaitMs, modelGatewayConcurrency, modelGatewayOnStatus }
  const oaiMessages = buildOpenAIMessages(messages, systemToText(system))
  const body = { model, messages: oaiMessages, stream }
  if (tools?.length) {
    body.tools = tools.map(t => ({ type: 'function', function: t }))
  }
  
  const headers = { 'content-type': 'application/json', 'authorization': `Bearer ${apiKey}` }

  if (stream && !proxyUrl) {
    return await streamOpenAI(url, headers, body, emit, signal, onToolReady, gatewayMeta(baseMeta, { url, requestBytes: byteLength(JSON.stringify(body)) }))
  }

  if (stream && proxyUrl) {
    const proxyHeaders = { ...headers, 'x-base-url': baseUrl || 'https://api.openai.com', 'x-provider': 'openai', 'x-api-key': apiKey }
    return await streamOpenAI(proxyUrl, proxyHeaders, body, emit, signal, onToolReady, gatewayMeta(baseMeta, { url: proxyUrl, baseUrl, requestBytes: byteLength(JSON.stringify(body)) }))
  }

  const response = await callLLM(url, apiKey, body, proxyUrl, false, signal, baseMeta)
  
  // Handle SSE response from non-stream endpoints
  if (typeof response === 'string' && response.includes('chat.completion.chunk')) {
    return parseSSEResponse(response)
  }
  
  const choice = response.choices?.[0]
  if (!choice) return { content: '', tool_calls: [], stop_reason: 'stop' }
  
  const text = choice.message?.content || ''
  
  return {
    content: text,
    tool_calls: choice.message?.tool_calls?.map(t => {
      let input = {}
      try { input = JSON.parse(t.function.arguments || '{}') } catch {}
      return { id: t.id, name: t.function.name, input }
    }) || [],
    stop_reason: choice.finish_reason
  }
}

// ── Streaming Functions ──

async function openaiResponsesChat({ messages, tools, model = 'gpt-4.1-mini', baseUrl = 'https://api.openai.com', apiKey, proxyUrl, stream = false, emit, system, signal, onToolReady, modelGatewayPriority, modelGatewaySource, modelGatewaySilent, modelGatewayRequestId, modelGatewayMaxWaitMs, modelGatewayConcurrency, modelGatewayOnStatus }) {
  const base = baseUrl.replace(/\/+$/, '')
  const url = base.includes('/v1') ? `${base}/responses` : `${base}/v1/responses`
  const baseMeta = { provider: 'openai-responses', model, baseUrl, apiKey, proxyUrl, modelGatewayPriority, modelGatewaySource, modelGatewaySilent, modelGatewayRequestId, modelGatewayMaxWaitMs, modelGatewayConcurrency, modelGatewayOnStatus }
  const input = buildOpenAIResponsesInput(messages)
  const body = { model, input, stream }
  const instructions = systemToText(system)
  if (instructions) body.instructions = instructions
  if (tools?.length) {
    // Responses API tools are flat (no `function` wrapper)
    body.tools = tools.map(t => ({
      type: 'function',
      name: t.name,
      description: t.description,
      parameters: t.input_schema || t.parameters,
    }))
    body.tool_choice = 'auto'
  }
  const headers = { 'content-type': 'application/json', 'authorization': `Bearer ${apiKey}` }

  if (stream) {
    let reqUrl = url
    let reqHeaders = headers
    if (proxyUrl) {
      reqHeaders = { ...headers, 'x-base-url': baseUrl || 'https://api.openai.com', 'x-provider': 'openai-responses', 'x-api-key': apiKey }
      reqUrl = proxyUrl
    }
    let content = '', toolCalls = [], stopReason = 'end_turn'
    for await (const evt of _streamOpenAIResponsesGen(reqUrl, reqHeaders, body, signal, gatewayMeta(baseMeta, { url: reqUrl, requestBytes: byteLength(JSON.stringify(body)) }))) {
      if (evt.type === 'text_delta') { content += evt.text; if (emit) emit('token', { text: evt.text }) }
      else if (evt.type === 'tool_ready') { toolCalls.push(evt.toolCall); if (onToolReady) onToolReady(evt.toolCall) }
      else if (evt.type === 'stop') { stopReason = evt.stop_reason }
    }
    return { content, tool_calls: toolCalls, stop_reason: stopReason }
  }

  // Non-streaming path: plain POST.
  const fetchBody = JSON.stringify(body)
  let res
  try {
    res = await modelFetch(url, {
      method: 'POST',
      headers,
      body: fetchBody,
      ...(signal ? { signal } : {}),
    }, gatewayMeta(baseMeta, { url, requestBytes: byteLength(fetchBody) }))
  } catch (err) {
    throw annotateModelError(err, gatewayMeta(baseMeta, { url, requestBytes: byteLength(fetchBody) }))
  }
  if (!res.ok) {
    const errText = await res.text()
    const e = new Error(`API error ${res.status}: ${errText.slice(0, 300)}`)
    annotateHttpResponseError(e, res, gatewayMeta(baseMeta, { url, requestBytes: byteLength(fetchBody) }))
    throw e
  }
  const resp = await res.json()
  let content = ''
  const tool_calls = []
  for (const item of resp.output || []) {
    if (item.type === 'message') {
      for (const c of item.content || []) {
        if (c.type === 'output_text' && c.text) content += c.text
      }
    } else if (item.type === 'function_call') {
      let input = {}
      try { input = item.arguments ? JSON.parse(item.arguments) : {} } catch {}
      tool_calls.push({ id: item.call_id || item.id, name: item.name, input })
    }
  }
  return { content, tool_calls, stop_reason: resp.status || 'end_turn' }
}

// streamAnthropic — legacy (non-generator), kept for backward compat
async function streamAnthropic(url, headers, body, emit, signal, onToolReady, meta) {
  let content = '', toolCalls = [], stopReason = 'end_turn'
  for await (const evt of _streamAnthropicGen(url, headers, body, signal, meta)) {
    if (evt.type === 'text_delta') { content += evt.text; emit('token', { text: evt.text }) }
    else if (evt.type === 'tool_ready') { toolCalls.push(evt.toolCall); if (onToolReady) onToolReady(evt.toolCall) }
    else if (evt.type === 'stop') { stopReason = evt.stop_reason }
  }
  return { content, tool_calls: toolCalls, stop_reason: stopReason }
}

// True streaming generator for Anthropic SSE.
// Robust to proxy variants: handles `data:` with or without space, CRLF, multi-line
// events (event: + data:), Anthropic `ping`/`error` control events, and proxies that
// only emit the event body (JSON without a `type` field, using the `event:` line).
// Set AGENTIC_DEBUG_STREAM=1 to surface otherwise-swallowed parse errors on stderr.
async function* _streamAnthropicGen(url, headers, body, signal, meta = {}) {
  const fetchOpts = { method: 'POST', headers, body: JSON.stringify(body) }
  if (signal) fetchOpts.signal = signal
  let res
  try {
    res = await modelFetch(url, fetchOpts, { ...meta, url, requestBytes: byteLength(fetchOpts.body) })
  } catch (err) {
    throw annotateModelError(err, { ...meta, url, requestBytes: byteLength(fetchOpts.body) })
  }
  if (!res.ok) {
    const err = await res.text()
    const e = new Error(`API error ${res.status}: ${err.slice(0, 300)}`)
    annotateHttpResponseError(e, res, { ...meta, url, requestBytes: byteLength(fetchOpts.body) })
    throw e
  }

  const debug = (typeof process !== 'undefined' && process.env && process.env.AGENTIC_DEBUG_STREAM)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let currentToolInput = ''
  let currentTool = null
  let sawAnyDelta = false // used to detect empty streams from misbehaving proxies

  // Yield an event object, normalising proxies that drop `type` but keep SSE `event:` line.
  function* handleEvent(eventName, data) {
    if (!data || data === '[DONE]') return
    let event
    try {
      event = JSON.parse(data)
    } catch (parseErr) {
      if (debug) console.error('[agentic-core] SSE JSON parse failed for event=%s data=%s err=%s', eventName, String(data).slice(0, 200), parseErr.message)
      return
    }
    // Some proxies strip event.type from the JSON body and only keep SSE `event:` line.
    if (!event.type && eventName) event.type = eventName

    // Proxy-emitted error frames (Anthropic sends `event: error` with { type: 'error', error: {...} })
    if (event.type === 'error') {
      const msg = event.error?.message || event.message || 'unknown upstream error'
      const code = event.error?.type || event.error?.code || 'upstream_error'
      const e = new Error(`Upstream stream error (${code}): ${msg}`)
      e.status = event.error?.status || 0
      throw e
    }
    if (event.type === 'ping') return

    if (event.type === 'message_start' && event.message?.usage) {
      yield { type: 'usage', usage: event.message.usage }
      return
    }

    if (event.type === 'content_block_delta') {
      if (event.delta?.type === 'text_delta') {
        sawAnyDelta = true
        yield { type: 'text_delta', text: event.delta.text || '' }
      } else if (event.delta?.type === 'input_json_delta') {
        currentToolInput += event.delta.partial_json || ''
        if (currentTool) {
          yield { type: 'tool_input_delta', id: currentTool.id, name: currentTool.name, partial_json: event.delta.partial_json || '' }
        }
      }
      // thinking_delta / reasoning_delta: intentionally not forwarded as text
      return
    }
    if (event.type === 'content_block_start') {
      if (event.content_block?.type === 'tool_use') {
        currentTool = { id: event.content_block.id, name: event.content_block.name }
        currentToolInput = ''
      }
      return
    }
    if (event.type === 'content_block_stop') {
      if (currentTool) {
        let input = {}
        try { input = JSON.parse(currentToolInput || '{}') } catch {}
        yield { type: 'tool_ready', toolCall: { ...currentTool, input } }
        currentTool = null
        currentToolInput = ''
      }
      return
    }
    if (event.type === 'message_delta') {
      if (event.usage) yield { type: 'usage', usage: event.usage }
      if (event.delta?.stop_reason) yield { type: 'stop', stop_reason: event.delta.stop_reason }
      return
    }
    if (debug && event.type) console.error('[agentic-core] unhandled SSE event type=%s', event.type)
  }

  // Drain one SSE frame (text between blank lines). Each frame can contain multiple
  // `event:` / `data:` lines; per the SSE spec, multiple `data:` lines are concatenated
  // with `\n`.
  function* drainFrame(frame) {
    if (!frame) return
    let eventName = ''
    const dataChunks = []
    const rawLines = frame.split(/\r?\n/)
    for (const rawLine of rawLines) {
      const line = rawLine
      if (!line || line.startsWith(':')) continue // comment / keepalive
      // Tolerate both `event: foo` and `event:foo`
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim()
      } else if (line.startsWith('data:')) {
        const rest = line.slice(5)
        // Anthropic spec is `data: {...}` but some proxies drop the space
        dataChunks.push(rest.startsWith(' ') ? rest.slice(1) : rest)
      }
      // id:/retry: silently ignored
    }
    if (dataChunks.length) {
      yield* handleEvent(eventName, dataChunks.join('\n').trim())
    }
  }

  while (true) {
    let chunk
    try { chunk = await reader.read() } catch (err) {
      if (debug) console.error('[agentic-core] stream read failed:', err.message)
      throw err
    }
    const { done, value } = chunk
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // SSE spec: events are separated by blank lines (`\n\n` or `\r\n\r\n`).
    // Some proxies emit only `\n`-separated events where each event is a single `data:` line.
    // Detect that case and fall back to line-by-line when no blank-line boundary appears.
    if (/\n\r?\n/.test(buffer)) {
      const parts = buffer.split(/\n\r?\n/)
      buffer = parts.pop() || ''
      for (const frame of parts) yield* drainFrame(frame)
    } else {
      // Best-effort: drain complete lines that start with `data:` (line-per-event proxies).
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() || ''
      for (const line of lines) {
        if (!line) continue
        if (line.startsWith('data:')) {
          yield* drainFrame(line)
        }
        // `event:` alone without a following data is meaningless; wait for the full frame.
      }
    }
  }
  // Flush any trailing frame (server closed without final blank line)
  if (buffer.trim()) {
    yield* drainFrame(buffer)
    buffer = ''
  }

  if (!sawAnyDelta && debug) {
    console.error('[agentic-core] anthropic stream ended without any text_delta — upstream may have returned an empty completion')
  }
}

// streamOpenAI — legacy (non-generator), kept for backward compat
async function streamOpenAI(url, headers, body, emit, signal, onToolReady, meta) {
  let content = '', finishReason = 'stop'
  const toolCallsMap = {}
  for await (const evt of _streamOpenAIGen(url, headers, body, signal, meta)) {
    if (evt.type === 'text_delta') { content += evt.text; emit('token', { text: evt.text }) }
    else if (evt.type === 'tool_delta') {
      const tc = evt.toolDelta
      if (!toolCallsMap[tc.index]) toolCallsMap[tc.index] = { id: '', name: '', arguments: '' }
      if (tc.id) toolCallsMap[tc.index].id = tc.id
      if (tc.name) toolCallsMap[tc.index].name = tc.name
      if (tc.arguments) toolCallsMap[tc.index].arguments += tc.arguments
    }
    else if (evt.type === 'stop') { finishReason = evt.stop_reason }
  }
  const tcList = Object.values(toolCallsMap).filter(t => t.name).map(t => {
    let input = {}; try { input = JSON.parse(t.arguments || '{}') } catch {}
    return { id: t.id, name: t.name, input }
  })
  if (onToolReady) { for (const tc of tcList) onToolReady(tc) }
  return { content, tool_calls: tcList, stop_reason: finishReason }
}

// True streaming generator for OpenAI SSE
async function* _streamOpenAIGen(url, headers, body, signal, meta = {}) {
  const fetchOpts = { method: 'POST', headers, body: JSON.stringify(body) }
  if (signal) fetchOpts.signal = signal
  let res
  try {
    res = await modelFetch(url, fetchOpts, { ...meta, url, requestBytes: byteLength(fetchOpts.body) })
  } catch (err) {
    throw annotateModelError(err, { ...meta, url, requestBytes: byteLength(fetchOpts.body) })
  }
  if (!res.ok) {
    const err = await res.text()
    const e = new Error(`API error ${res.status}: ${err.slice(0, 300)}`)
    annotateHttpResponseError(e, res, { ...meta, url, requestBytes: byteLength(fetchOpts.body) })
    throw e
  }

  const debug = (typeof process !== 'undefined' && process.env && process.env.AGENTIC_DEBUG_STREAM)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  function* handleFrame(frame) {
    if (!frame) return
    const dataChunks = []
    for (const rawLine of frame.split(/\r?\n/)) {
      if (!rawLine || rawLine.startsWith(':')) continue
      if (rawLine.startsWith('data:')) {
        const rest = rawLine.slice(5)
        dataChunks.push(rest.startsWith(' ') ? rest.slice(1) : rest)
      }
    }
    if (!dataChunks.length) return
    const data = dataChunks.join('\n').trim()
    if (!data || data === '[DONE]') return
    let chunk
    try { chunk = JSON.parse(data) } catch (err) {
      if (debug) console.error('[agentic-core] SSE JSON parse failed (openai) data=%s err=%s', data.slice(0, 200), err.message)
      return
    }
    // OpenAI-compatible error frames
    if (chunk.error) {
      const e = new Error(`Upstream stream error: ${chunk.error.message || JSON.stringify(chunk.error).slice(0,200)}`)
      e.status = chunk.error.status || 0
      throw e
    }
    const delta = chunk.choices?.[0]?.delta
    if (!delta) return
    if (delta.content) yield { type: 'text_delta', text: delta.content }
    if (chunk.choices?.[0]?.finish_reason) yield { type: 'stop', stop_reason: chunk.choices[0].finish_reason }
    if (delta.tool_calls) {
      for (const tc of delta.tool_calls) {
        yield { type: 'tool_delta', toolDelta: { index: tc.index, id: tc.id || '', name: tc.function?.name || '', arguments: tc.function?.arguments || '' } }
      }
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    if (/\n\r?\n/.test(buffer)) {
      const parts = buffer.split(/\n\r?\n/)
      buffer = parts.pop() || ''
      for (const frame of parts) yield* handleFrame(frame)
    } else {
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() || ''
      for (const line of lines) {
        if (line && line.startsWith('data:')) yield* handleFrame(line)
      }
    }
  }
  if (buffer.trim()) yield* handleFrame(buffer)
}

// True streaming generator for OpenAI Responses API SSE.
// Responses API uses *named* SSE events (event: response.output_text.delta, etc.)
// instead of the choices/delta shape of Chat Completions.
// Normalises them to the same internal event types this package already uses
// so downstream code doesn't need to care which transport ran.
async function* _streamOpenAIResponsesGen(url, headers, body, signal, meta = {}) {
  const fetchOpts = { method: 'POST', headers, body: JSON.stringify(body) }
  if (signal) fetchOpts.signal = signal
  let res
  try {
    res = await modelFetch(url, fetchOpts, { ...meta, url, requestBytes: byteLength(fetchOpts.body) })
  } catch (err) {
    throw annotateModelError(err, { ...meta, url, requestBytes: byteLength(fetchOpts.body) })
  }
  if (!res.ok) {
    const err = await res.text()
    const e = new Error(`API error ${res.status}: ${err.slice(0, 300)}`)
    annotateHttpResponseError(e, res, { ...meta, url, requestBytes: byteLength(fetchOpts.body) })
    throw e
  }

  const debug = (typeof process !== 'undefined' && process.env && process.env.AGENTIC_DEBUG_STREAM)
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  // Track in-progress function_call items so we can emit one `tool_ready`
  // per completed call instead of per-delta.
  const funcCallByItemId = {}
  let nextIndex = 0

  function* handleFrame(frame) {
    if (!frame) return
    let eventName = 'message'
    const dataChunks = []
    for (const rawLine of frame.split(/\r?\n/)) {
      if (!rawLine || rawLine.startsWith(':')) continue
      if (rawLine.startsWith('event:')) {
        eventName = rawLine.slice(6).trim()
      } else if (rawLine.startsWith('data:')) {
        const rest = rawLine.slice(5)
        dataChunks.push(rest.startsWith(' ') ? rest.slice(1) : rest)
      }
    }
    if (!dataChunks.length) return
    const data = dataChunks.join('\n').trim()
    if (!data || data === '[DONE]') return
    let chunk
    try { chunk = JSON.parse(data) } catch (err) {
      if (debug) console.error('[agentic-core] SSE JSON parse failed (openai responses) data=%s err=%s', data.slice(0, 200), err.message)
      return
    }

    // Some deployments include `type` inside the payload; prefer the explicit event line.
    const type = eventName !== 'message' ? eventName : (chunk.type || 'message')

    // Error frames
    if (type === 'error' || type === 'response.error' || chunk.error) {
      const msg = chunk.error?.message || chunk.message || 'upstream error'
      const e = new Error(`Upstream stream error: ${String(msg).slice(0, 200)}`)
      e.status = chunk.error?.status || chunk.status || 0
      throw e
    }

    if (type === 'response.output_text.delta') {
      if (chunk.delta) yield { type: 'text_delta', text: chunk.delta }
      return
    }

    // Function call lifecycle. Responses API emits output_item.added with a
    // partially-populated function_call, then argument deltas, then output_item.done.
    if (type === 'response.output_item.added' && chunk.item?.type === 'function_call') {
      const it = chunk.item
      funcCallByItemId[it.id] = {
        id: it.call_id || it.id,
        name: it.name || '',
        arguments: typeof it.arguments === 'string' ? it.arguments : '',
        index: nextIndex++,
      }
      return
    }
    if (type === 'response.function_call_arguments.delta') {
      const key = chunk.item_id
      if (!funcCallByItemId[key]) funcCallByItemId[key] = { id: '', name: '', arguments: '', index: nextIndex++ }
      if (typeof chunk.delta === 'string') funcCallByItemId[key].arguments += chunk.delta
      return
    }
    if (type === 'response.output_item.done' && chunk.item?.type === 'function_call') {
      const it = chunk.item
      const buf = funcCallByItemId[it.id] || {}
      const argsStr = typeof it.arguments === 'string' && it.arguments
        ? it.arguments
        : (buf.arguments || '')
      let parsed = {}
      try { parsed = argsStr ? JSON.parse(argsStr) : {} } catch {}
      delete funcCallByItemId[it.id]
      yield {
        type: 'tool_ready',
        toolCall: { id: it.call_id || buf.id || it.id, name: it.name || buf.name || '', input: parsed },
      }
      return
    }

    if (type === 'response.completed' || type === 'response.incomplete') {
      const r = chunk.response || {}
      const reason = r.incomplete_details?.reason || r.status || (type === 'response.incomplete' ? 'incomplete' : 'end_turn')
      yield { type: 'stop', stop_reason: reason }
      if (r.usage) {
        yield {
          type: 'usage',
          usage: {
            input_tokens: r.usage.input_tokens,
            output_tokens: r.usage.output_tokens,
            cache_read_input_tokens: r.usage.input_tokens_details?.cached_tokens || 0,
            cache_creation_input_tokens: 0,
          },
        }
      }
      return
    }

    // Silently ignore other housekeeping events (response.created / in_progress / content_part.* / refusal / ...)
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    if (/\n\r?\n/.test(buffer)) {
      const parts = buffer.split(/\n\r?\n/)
      buffer = parts.pop() || ''
      for (const frame of parts) yield* handleFrame(frame)
    }
  }
  if (buffer.trim()) yield* handleFrame(buffer)
}

// ── Non-stream Proxy/Direct Call ──

async function callLLM(url, apiKey, body, proxyUrl, isAnthropic = false, signal, meta = {}) {
  const headers = { 'content-type': 'application/json' }
  const provider = meta.provider || (isAnthropic ? 'anthropic' : 'openai')
  const baseUrl = meta.baseUrl || url.replace(/\/v1\/.*$/, '')
  const baseMeta = gatewayMeta(meta, { provider, baseUrl, apiKey, proxyUrl })
  if (isAnthropic) {
    headers['x-api-key'] = apiKey
    headers['anthropic-version'] = '2023-06-01'
  } else {
    headers['authorization'] = `Bearer ${apiKey}`
  }

  if (proxyUrl) {
    const proxyHeaders = {
      ...headers,
      'x-base-url': url.replace(/\/v1\/.*$/, ''),
      'x-provider': isAnthropic ? 'anthropic' : 'openai',
      'x-api-key': apiKey,
    }
    const fetchOpts = { method: 'POST', headers: proxyHeaders, body: JSON.stringify(body) }
    if (signal) fetchOpts.signal = signal
    const requestMeta = gatewayMeta(baseMeta, { url: proxyUrl, baseUrl, requestBytes: byteLength(fetchOpts.body) })
    let response
    try {
      response = await modelFetch(proxyUrl, fetchOpts, requestMeta)
    } catch (err) {
      throw annotateModelError(err, requestMeta)
    }
    if (!response.ok) {
      const text = await response.text()
      const e = new Error(`API error ${response.status}: ${text.slice(0, 300)}`)
      annotateHttpResponseError(e, response, requestMeta)
      throw e
    }
    return await response.json()
  } else {
    const fetchOpts = { method: 'POST', headers, body: JSON.stringify(body) }
    if (signal) fetchOpts.signal = signal
    const requestMeta = gatewayMeta(baseMeta, { url, requestBytes: byteLength(fetchOpts.body) })
    let response
    try {
      response = await modelFetch(url, fetchOpts, requestMeta)
    } catch (err) {
      throw annotateModelError(err, requestMeta)
    }
    if (!response.ok) {
      const text = await response.text()
      const e = new Error(`API error ${response.status}: ${text}`)
      annotateHttpResponseError(e, response, requestMeta)
      throw e
    }
    const text = await response.text()
    if (text.trimStart().startsWith('data: ')) return reassembleSSE(text)
    return JSON.parse(text)
  }
}

function parseSSEResponse(sseText) {
  const lines = sseText.split('\n')
  let textContent = ''
  const toolCalls = []
  let currentToolCall = null
  let lastChunkWasToolUse = false
  
  for (const line of lines) {
    if (!line.trim()) continue
    try {
      let jsonStr = line
      if (line.includes('data: ')) jsonStr = line.split('data: ')[1]
      if (!jsonStr || !jsonStr.includes('{')) continue
      const startIdx = jsonStr.indexOf('{')
      const endIdx = jsonStr.lastIndexOf('}')
      if (startIdx === -1 || endIdx === -1) continue
      const chunk = JSON.parse(jsonStr.substring(startIdx, endIdx + 1))
      if (chunk.choices?.[0]?.delta?.content) {
        textContent += chunk.choices[0].delta.content
        lastChunkWasToolUse = false
      }
      if (chunk.name) {
        if (currentToolCall && currentToolCall.name !== chunk.name) toolCalls.push(currentToolCall)
        currentToolCall = { id: chunk.call_id || `call_${Date.now()}`, name: chunk.name, arguments: chunk.arguments || '' }
        lastChunkWasToolUse = true
      } else if (lastChunkWasToolUse && chunk.arguments !== undefined && currentToolCall) {
        currentToolCall.arguments += chunk.arguments
      }
    } catch {}
  }
  if (currentToolCall) toolCalls.push(currentToolCall)
  const parsedToolCalls = toolCalls.map(t => {
    let input = {}
    try { if (t.arguments.trim()) input = JSON.parse(t.arguments) } catch {}
    return { id: t.id, name: t.name, input }
  })
  return { content: textContent, tool_calls: parsedToolCalls, stop_reason: parsedToolCalls.length > 0 ? 'tool_use' : 'stop' }
}

function reassembleSSE(raw) {
  const lines = raw.split('\n')
  let content = ''
  let toolCalls = {}
  let model = ''
  let usage = null
  let finishReason = null
  for (const line of lines) {
    if (!line.startsWith('data: ') || line === 'data: [DONE]') continue
    try {
      const chunk = JSON.parse(line.slice(6))
      if (chunk.model) model = chunk.model
      if (chunk.usage) usage = chunk.usage
      const delta = chunk.choices?.[0]?.delta
      if (!delta) continue
      if (delta.content) content += delta.content
      if (delta.finish_reason) finishReason = delta.finish_reason
      if (chunk.choices?.[0]?.finish_reason) finishReason = chunk.choices[0].finish_reason
      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (!toolCalls[tc.index]) toolCalls[tc.index] = { id: '', name: '', arguments: '' }
          if (tc.id) toolCalls[tc.index].id = tc.id
          if (tc.function?.name) toolCalls[tc.index].name = tc.function.name
          if (tc.function?.arguments) toolCalls[tc.index].arguments += tc.function.arguments
        }
      }
    } catch {}
  }
  const tcList = Object.values(toolCalls).filter(t => t.name)
  return {
    choices: [{ message: { content, tool_calls: tcList.length ? tcList.map(t => ({ id: t.id, type: 'function', function: { name: t.name, arguments: t.arguments } })) : undefined }, finish_reason: finishReason || 'stop' }],
    model, usage: usage || { prompt_tokens: 0, completion_tokens: 0 }
  }
}

// ── Tool Result Normaliser ──
// Tools can return any of:
//   string                             → { content: [{ type:'text', text }] }
//   { error: '...' }                    → is_error:true + text block with error
//   { content: [blocks], is_error? }    → structured (the canonical shape)
//   any other object                    → JSON.stringify-ed text block
//
// Normalized block types this layer understands:
//   { type:'text', text }
//   { type:'image', source:{ type:'base64', media_type, data } }                         (Anthropic / OpenAI)
//   { type:'image', source:{ type:'url', url } }                                          (OpenAI native; Anthropic gets fetched or downgraded)
//   { type:'image', source:{ type:'path', path, media_type? } }                           (auto-read + base64 when possible)
//   { type:'document', source:{ type:'base64'|'url'|'path', data|url|path, media_type } } (PDF etc.)
//   { type:'audio',   source:{ type:'base64'|'url'|'path', data|url|path, media_type } }  (Gemini-native; downgraded elsewhere)
//   { type:'video',   source:{ type:'base64'|'url'|'path', data|url|path, media_type } }  (Gemini-native; downgraded elsewhere)
//   { type:'file',    source:{ type:'path'|'url', path|url, media_type?, summary? } }     (generic reference — inlined when small enough, otherwise passed as metadata + summary)
//
// For convenience we also accept legacy keys:
//   { image, media_type } | { image_base64 } | { image_url } | { path }
//
// The normaliser never throws for unknown shapes — it stringifies as text fallback.

const DEFAULT_INLINE_LIMITS = {
  image: 5 * 1024 * 1024,      // 5 MB per image
  document: 10 * 1024 * 1024,  // 10 MB per PDF
  audio: 10 * 1024 * 1024,
  video: 10 * 1024 * 1024,
  file: 2 * 1024 * 1024,       // generic file inlined as text only if small
  totalPerResult: 20 * 1024 * 1024, // 20 MB per tool_result
}

function _guessMediaType(pathOrUrl, fallback = 'application/octet-stream') {
  if (!pathOrUrl) return fallback
  const m = /\.([a-zA-Z0-9]+)(?:$|[?#])/.exec(String(pathOrUrl))
  const ext = m ? m[1].toLowerCase() : ''
  switch (ext) {
    case 'png': return 'image/png'
    case 'jpg': case 'jpeg': return 'image/jpeg'
    case 'gif': return 'image/gif'
    case 'webp': return 'image/webp'
    case 'pdf': return 'application/pdf'
    case 'txt': case 'md': case 'markdown': case 'log': return 'text/plain'
    case 'json': return 'application/json'
    case 'mp3': return 'audio/mpeg'
    case 'wav': return 'audio/wav'
    case 'ogg': return 'audio/ogg'
    case 'm4a': return 'audio/mp4'
    case 'mp4': return 'video/mp4'
    case 'mov': return 'video/quicktime'
    case 'webm': return 'video/webm'
    default: return fallback
  }
}

function _decodeBase64Len(b64) {
  if (!b64) return 0
  // Approx decoded-byte length from base64 length; avoids decoding for size check.
  const padding = (b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0)
  return Math.floor(b64.length * 3 / 4) - padding
}

async function _readFileAsBase64(path) {
  if (typeof process === 'undefined' || !process.versions?.node) {
    throw new Error('file-path blocks require Node.js runtime')
  }
  const fs = await import('node:fs/promises')
  const buf = await fs.readFile(path)
  return buf.toString('base64')
}

async function _readFileAsText(path, maxBytes = 1024 * 1024) {
  if (typeof process === 'undefined' || !process.versions?.node) {
    throw new Error('file-path blocks require Node.js runtime')
  }
  const fs = await import('node:fs/promises')
  const buf = await fs.readFile(path)
  const slice = buf.byteLength > maxBytes ? buf.subarray(0, maxBytes) : buf
  const suffix = buf.byteLength > maxBytes ? `\n\n…[truncated ${buf.byteLength - maxBytes} bytes]` : ''
  return slice.toString('utf8') + suffix
}

// Turn any user-supplied tool output into an array of canonical blocks.
// Async because `path` sources may need fs reads; returns { blocks, is_error }.
async function normalizeToolResultBlocks(rawResult, options = {}) {
  const limits = { ...DEFAULT_INLINE_LIMITS, ...(options.limits || {}) }
  let is_error = false
  let input = rawResult

  if (input === undefined || input === null) {
    return { blocks: [{ type: 'text', text: '' }], is_error: false }
  }
  if (typeof input === 'string') {
    return { blocks: [{ type: 'text', text: input }], is_error: false }
  }
  if (typeof input !== 'object') {
    return { blocks: [{ type: 'text', text: String(input) }], is_error: false }
  }

  // Explicit error shape → is_error + text block
  if (input.error && !Array.isArray(input.content)) {
    return {
      blocks: [{ type: 'text', text: typeof input.error === 'string' ? input.error : JSON.stringify(input.error) }],
      is_error: true,
    }
  }

  // Legacy convenience: single-block object
  if (Array.isArray(input.content)) {
    is_error = !!input.is_error
    input = { content: input.content }
  } else if (input.type && typeof input.type === 'string') {
    input = { content: [input] }
  } else if (typeof input.image_base64 === 'string' || (typeof input.image === 'string' && (input.image.startsWith('data:') || input.media_type))) {
    const data = input.image_base64 || (input.image.startsWith('data:') ? input.image.split(',')[1] : input.image)
    const media_type = input.media_type || (input.image.startsWith('data:image/') ? input.image.slice(5, input.image.indexOf(';')) : 'image/png')
    input = { content: [{ type: 'image', source: { type: 'base64', media_type, data } }] }
  } else if (input.image && typeof input.image === 'object' && typeof input.image.data === 'string') {
    // Shorthand: { image: { data, media_type }, output? } — optional `output` becomes a text block
    const blocks = []
    if (typeof input.output === 'string' && input.output) blocks.push({ type: 'text', text: input.output })
    blocks.push({ type: 'image', source: { type: 'base64', media_type: input.image.media_type || 'image/png', data: input.image.data } })
    input = { content: blocks }
  } else if (typeof input.image_url === 'string') {
    input = { content: [{ type: 'image', source: { type: 'url', url: input.image_url } }] }
  } else if (typeof input.path === 'string') {
    input = { content: [{ type: 'file', source: { type: 'path', path: input.path, media_type: _guessMediaType(input.path) } }] }
  } else {
    // Plain data object → JSON text
    return { blocks: [{ type: 'text', text: JSON.stringify(input) }], is_error: false }
  }

  const normalized = []
  let totalBytes = 0

  for (const rawBlock of input.content || []) {
    if (!rawBlock) continue
    if (typeof rawBlock === 'string') {
      normalized.push({ type: 'text', text: rawBlock })
      continue
    }
    if (rawBlock.type === 'text') {
      normalized.push({ type: 'text', text: String(rawBlock.text ?? '') })
      continue
    }

    // Unify source block across media types
    const kind = rawBlock.type
    if (!['image', 'document', 'audio', 'video', 'file'].includes(kind)) {
      normalized.push({ type: 'text', text: `[unknown block ${kind}] ${JSON.stringify(rawBlock).slice(0, 200)}` })
      continue
    }

    let source = rawBlock.source
    // Support shorthand: image.data (string) implies base64
    if (!source) {
      if (typeof rawBlock.data === 'string') source = { type: 'base64', data: rawBlock.data, media_type: rawBlock.media_type }
      else if (typeof rawBlock.url === 'string') source = { type: 'url', url: rawBlock.url, media_type: rawBlock.media_type }
      else if (typeof rawBlock.path === 'string') source = { type: 'path', path: rawBlock.path, media_type: rawBlock.media_type }
    }
    if (!source || typeof source !== 'object') {
      normalized.push({ type: 'text', text: `[${kind}] <no source>` })
      continue
    }

    let { type: srcType, data, url, path, media_type } = source
    if (!media_type) media_type = _guessMediaType(path || url, kind === 'image' ? 'image/png' : 'application/octet-stream')

    let resolved
    try {
      if (srcType === 'base64') {
        const size = _decodeBase64Len(data)
        if (size > (limits[kind] || limits.file)) {
          normalized.push({ type: 'text', text: `[${kind} omitted: ${size} bytes exceeds ${limits[kind]} limit]` })
          continue
        }
        totalBytes += size
        resolved = { type: kind, source: { type: 'base64', media_type, data } }
      } else if (srcType === 'url') {
        totalBytes += 128 // nominal
        resolved = { type: kind, source: { type: 'url', media_type, url } }
      } else if (srcType === 'path') {
        // Try to inline from disk; fall back to text metadata if too big or not readable
        let size = 0
        try {
          if (typeof process !== 'undefined' && process.versions?.node) {
            const fs = await import('node:fs/promises')
            const stat = await fs.stat(path)
            size = stat.size
          }
        } catch { /* ignore */ }
        const cap = limits[kind] || limits.file
        // For generic `file` blocks with a text media type, prefer inlining as text (more useful to the model).
        if (kind === 'file' && media_type.startsWith('text/')) {
          const text = await _readFileAsText(path, limits.file)
          normalized.push({ type: 'text', text: `[file ${path}]\n${text}` })
          continue
        }
        if (size > 0 && size <= cap) {
          const data64 = await _readFileAsBase64(path)
          totalBytes += size
          resolved = { type: kind, source: { type: 'base64', media_type, data: data64 } }
        } else {
          const summary = rawBlock.summary || source.summary
          normalized.push({ type: 'text', text: `[${kind} ${path} ${size ? `${size} bytes` : ''} ${media_type}]${summary ? `\n${summary}` : ''}` })
          continue
        }
      } else {
        normalized.push({ type: 'text', text: `[${kind}] <unsupported source ${srcType}>` })
        continue
      }
    } catch (err) {
      normalized.push({ type: 'text', text: `[${kind} error: ${err.message}]` })
      continue
    }

    if (totalBytes > limits.totalPerResult) {
      normalized.push({ type: 'text', text: `[tool_result truncated: exceeded ${limits.totalPerResult} byte budget]` })
      break
    }
    normalized.push(resolved)
  }

  if (!normalized.length) normalized.push({ type: 'text', text: '' })
  return { blocks: normalized, is_error }
}

// Map normalized blocks → Anthropic tool_result.content (text + image only) and
// return any "companion" user-message blocks (document / audio / video) that
// Anthropic disallows inside tool_result. Companion blocks are emitted as a
// follow-up user message immediately after the tool_result block.
function blocksForAnthropicToolResult(blocks) {
  const primary = []   // what goes inside tool_result.content
  const companion = [] // posted as a separate user message with a leading text note
  for (const b of blocks) {
    if (b.type === 'text') { primary.push({ type: 'text', text: b.text }); continue }
    if (b.type === 'image' && b.source?.type === 'base64') { primary.push({ type: 'image', source: b.source }); continue }
    if (b.type === 'image' && b.source?.type === 'url') {
      // Anthropic tool_result does not accept URL images; inline a short note and
      // put the image in the companion message instead (where URL images ARE accepted).
      primary.push({ type: 'text', text: `[image available at ${b.source.url}]` })
      companion.push({ type: 'image', source: { type: 'url', url: b.source.url } })
      continue
    }
    if (b.type === 'document') {
      primary.push({ type: 'text', text: '[document attached — see next message]' })
      if (b.source?.type === 'base64') companion.push({ type: 'document', source: b.source })
      else if (b.source?.type === 'url') companion.push({ type: 'document', source: { type: 'url', url: b.source.url } })
      continue
    }
    if (b.type === 'audio' || b.type === 'video' || b.type === 'file') {
      // Anthropic has no native tool_result slot for these; describe in text.
      const desc = b.source?.type === 'url' ? `url=${b.source.url}` : (b.source?.type === 'path' ? `path=${b.source.path}` : (b.source?.media_type || 'binary'))
      primary.push({ type: 'text', text: `[${b.type} ${desc}]` })
      continue
    }
    // Fallback
    primary.push({ type: 'text', text: JSON.stringify(b).slice(0, 500) })
  }
  return { primary, companion }
}

// Map normalized blocks → OpenAI Chat Completions tool-role content.
// Chat Completions `tool` messages only accept string content, so we emit
// a text summary and return separate user-content parts for the multimodal
// channel (images/audio) that must be sent as a follow-up user message.
function blocksForOpenAIToolResult(blocks) {
  const parts = []      // goes into follow-up user message as content parts
  const textLines = []  // joined into tool message content (string)
  for (const b of blocks) {
    if (b.type === 'text') { textLines.push(b.text); continue }
    if (b.type === 'image') {
      const url = b.source?.type === 'url'
        ? b.source.url
        : `data:${b.source?.media_type || 'image/png'};base64,${b.source?.data || ''}`
      parts.push({ type: 'image_url', image_url: { url, detail: 'auto' } })
      textLines.push(`[image attached — see next user message]`)
      continue
    }
    if (b.type === 'audio') {
      if (b.source?.type === 'base64') parts.push({ type: 'input_audio', input_audio: { data: b.source.data, format: (b.source.media_type || 'audio/wav').split('/')[1] || 'wav' } })
      textLines.push(`[audio attached]`)
      continue
    }
    if (b.type === 'document' || b.type === 'file') {
      const desc = b.source?.type === 'url' ? `url=${b.source.url}` : (b.source?.type === 'path' ? `path=${b.source.path}` : (b.source?.media_type || 'binary'))
      textLines.push(`[${b.type} ${desc}]`)
      continue
    }
    if (b.type === 'video') {
      textLines.push('[video attached — not supported by this provider]')
      continue
    }
    textLines.push(JSON.stringify(b).slice(0, 500))
  }
  return { text: textLines.join('\n').trim(), parts }
}

// Build Anthropic `messages` array from our internal format. Understands the
// optional `m.blocks` / `m.is_error` fields set by executeTool paths and maps
// them via blocksForAnthropicToolResult (which can emit a companion user
// message for disallowed-inside-tool_result content like PDFs / URL images).
function buildAnthropicMessages(messages) {
  const out = []
  for (const m of messages) {
    if (m.role === 'user') {
      out.push({ role: 'user', content: m.content })
    } else if (m.role === 'assistant') {
      if (m.tool_calls?.length) {
        const blocks = []
        if (m.content) blocks.push({ type: 'text', text: m.content })
        for (const tc of m.tool_calls) blocks.push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.input })
        out.push({ role: 'assistant', content: blocks })
      } else {
        out.push({ role: 'assistant', content: m.content })
      }
    } else if (m.role === 'tool') {
      const useBlocks = Array.isArray(m.blocks) && m.blocks.length > 0
      let primary, companion = []
      if (useBlocks) {
        const mapped = blocksForAnthropicToolResult(m.blocks)
        primary = mapped.primary
        companion = mapped.companion
      } else {
        primary = [{ type: 'text', text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content ?? '') }]
      }
      const toolResult = { type: 'tool_result', tool_use_id: m.tool_call_id, content: primary }
      if (m.is_error) toolResult.is_error = true
      const last = out[out.length - 1]
      if (last?.role === 'user' && Array.isArray(last.content) && last.content[0]?.type === 'tool_result') {
        last.content.push(toolResult)
      } else {
        out.push({ role: 'user', content: [toolResult] })
      }
      if (companion.length) {
        // Anthropic allows images / documents in ordinary user messages; send them
        // right after the tool_result so the model associates them with the result.
        out.push({ role: 'user', content: [{ type: 'text', text: `Attachments from tool call ${m.tool_call_id}:` }, ...companion] })
      }
    }
  }
  return out
}

// Build OpenAI Chat Completions `messages` array. `tool` role only accepts
// string content in Chat Completions, so we stringify multimodal blocks into
// a summary string on the tool message and push a follow-up user message with
// the actual image/audio parts (which IS supported in user content).
function buildOpenAIMessages(messages, system) {
  const out = []
  if (system) out.push({ role: 'system', content: system })
  for (const m of messages) {
    if (m.role === 'assistant') {
      const msg = {
        role: 'assistant',
        content: typeof m.content === 'string' ? m.content : (m.content ?? ''),
      }
      const toolCalls = normalizeOpenAIToolCalls(m.tool_calls)
      if (toolCalls.length) msg.tool_calls = toolCalls
      out.push(msg)
      continue
    }
    if (m.role === 'tool' && Array.isArray(m.blocks) && m.blocks.length > 0) {
      const { text, parts } = blocksForOpenAIToolResult(m.blocks)
      const prefix = m.is_error ? '[tool error]\n' : ''
      out.push({ role: 'tool', tool_call_id: m.tool_call_id, content: prefix + (text || '') })
      if (parts.length) {
        out.push({
          role: 'user',
          content: [
            { type: 'text', text: `Attachments from tool call ${m.tool_call_id}:` },
            ...parts,
          ],
        })
      }
      continue
    }
    // Default: passthrough. Strip our extension fields so providers don't reject unknown keys.
    if (m.role === 'tool') {
      out.push({ role: 'tool', tool_call_id: m.tool_call_id, content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content ?? '') })
    } else {
      out.push(m)
    }
  }
  return out
}

function normalizeOpenAIToolCalls(toolCalls) {
  if (!Array.isArray(toolCalls)) return []
  return toolCalls
    .filter(tc => tc && (tc.id || tc.call_id) && (tc.name || tc.function?.name))
    .map(tc => {
      const existingArgs = tc.function?.arguments ?? tc.arguments
      return {
        id: String(tc.id || tc.call_id),
        type: 'function',
        function: {
          name: String(tc.name || tc.function?.name),
          arguments: typeof existingArgs === 'string'
            ? existingArgs
            : JSON.stringify(tc.input ?? existingArgs ?? {}),
        },
      }
    })
}

// Convert canonical tool-result blocks into OpenAI Responses API `output` items.
// Responses API natively supports mixed text + input_image inside a function_call_output.
// Other media (audio/video/document/file) currently collapse to input_text descriptions
// until the API grows native slots for them.
function blocksForOpenAIResponsesToolResult(blocks) {
  const output = []
  const pending = []
  function flushText() {
    if (pending.length) {
      output.push({ type: 'input_text', text: pending.join('\n') })
      pending.length = 0
    }
  }
  for (const b of blocks || []) {
    if (!b) continue
    if (b.type === 'text') {
      pending.push(b.text ?? '')
      continue
    }
    if (b.type === 'image') {
      flushText()
      const src = b.source || {}
      if (src.type === 'base64' && src.data) {
        const media = src.media_type || 'image/png'
        output.push({ type: 'input_image', image_url: `data:${media};base64,${src.data}` })
      } else if (src.type === 'url' && src.url) {
        output.push({ type: 'input_image', image_url: src.url })
      } else {
        pending.push('[image: unsupported source shape]')
        flushText()
      }
      continue
    }
    // document / audio / video / file have no native Responses slot yet — describe in text.
    const src = b.source || {}
    const locator = src.type === 'url' ? src.url
      : src.type === 'path' ? src.path
      : src.type === 'base64' ? `${_decodeBase64Len(src.data || '')} bytes`
      : 'inline'
    const media_type = src.media_type || b.media_type || 'application/octet-stream'
    pending.push(`[${b.type} ${locator} ${media_type}]${b.summary ? `\n${b.summary}` : ''}`)
  }
  flushText()
  // Responses API requires at least one item
  if (!output.length) output.push({ type: 'input_text', text: '' })
  return output
}

// Convert canonical messages into Responses API `input` items.
// Mapping:
//   - { role: 'system' } → kept out (callers pass `instructions` separately)
//   - { role: 'user', content: string } → { type: 'message', role: 'user', content: [{ type: 'input_text', text }] }
//   - { role: 'user', content: [...] } → structured content preserved (images become input_image)
//   - { role: 'assistant', content: string } → { type: 'message', role: 'assistant', content: [{ type: 'output_text', text }] }
//   - { role: 'assistant', tool_calls: [...] } → one `function_call` item per call (plus optional text message before)
//   - { role: 'tool', tool_call_id, blocks|content } → one `function_call_output` item carrying the multimodal output
function buildOpenAIResponsesInput(messages) {
  const input = []
  for (const m of messages) {
    if (m.role === 'system') continue // system goes to `instructions` field, not input
    if (m.role === 'user') {
      if (typeof m.content === 'string') {
        input.push({ type: 'message', role: 'user', content: [{ type: 'input_text', text: m.content }] })
      } else if (Array.isArray(m.content)) {
        const parts = []
        for (const p of m.content) {
          if (!p) continue
          if (p.type === 'text' || p.type === 'input_text') {
            parts.push({ type: 'input_text', text: p.text || '' })
          } else if (p.type === 'image_url') {
            const url = typeof p.image_url === 'string' ? p.image_url : p.image_url?.url
            if (url) parts.push({ type: 'input_image', image_url: url })
          } else if (p.type === 'image' && p.source) {
            if (p.source.type === 'base64' && p.source.data) {
              parts.push({ type: 'input_image', image_url: `data:${p.source.media_type || 'image/png'};base64,${p.source.data}` })
            } else if (p.source.type === 'url' && p.source.url) {
              parts.push({ type: 'input_image', image_url: p.source.url })
            }
          } else if (p.type === 'input_audio' && p.input_audio) {
            // Responses API audio support varies by model — pass through best-effort.
            parts.push({ type: 'input_audio', input_audio: p.input_audio })
          } else {
            // Unknown part: serialise as text so nothing silently vanishes
            parts.push({ type: 'input_text', text: typeof p === 'string' ? p : JSON.stringify(p) })
          }
        }
        if (!parts.length) parts.push({ type: 'input_text', text: '' })
        input.push({ type: 'message', role: 'user', content: parts })
      } else {
        input.push({ type: 'message', role: 'user', content: [{ type: 'input_text', text: JSON.stringify(m.content ?? '') }] })
      }
      continue
    }
    if (m.role === 'assistant') {
      if (typeof m.content === 'string' && m.content) {
        input.push({ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: m.content }] })
      }
      if (Array.isArray(m.tool_calls)) {
        for (const tc of m.tool_calls) {
          input.push({
            type: 'function_call',
            call_id: tc.id,
            name: tc.name,
            arguments: typeof tc.input === 'string' ? tc.input : JSON.stringify(tc.input ?? {}),
          })
        }
      }
      continue
    }
    if (m.role === 'tool') {
      if (Array.isArray(m.blocks) && m.blocks.length > 0) {
        const output = blocksForOpenAIResponsesToolResult(m.blocks)
        const item = {
          type: 'function_call_output',
          call_id: m.tool_call_id,
          output,
        }
        if (m.is_error) item.is_error = true
        input.push(item)
      } else {
        const text = typeof m.content === 'string' ? m.content : JSON.stringify(m.content ?? '')
        const prefix = m.is_error ? '[tool error]\n' : ''
        input.push({
          type: 'function_call_output',
          call_id: m.tool_call_id,
          output: [{ type: 'input_text', text: prefix + text }],
          ...(m.is_error ? { is_error: true } : {}),
        })
      }
      continue
    }
  }
  return input
}

// ── Tools ──

function buildToolDefs(tools) {
  const defs = []
  const customTools = []
  
  // Add registry tools first
  for (const tool of toolRegistry.list()) {
    defs.push({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters
    })
  }
  
  for (const tool of tools) {
    if (typeof tool === 'string') {
      // Built-in tool
      if (tool === 'search') {
        defs.push({ name: 'search', description: 'Search the web for current information', input_schema: { type: 'object', properties: { query: { type: 'string', description: 'Search query' } }, required: ['query'] } })
      } else if (tool === 'code') {
        defs.push({ name: 'execute_code', description: 'Execute Python code', input_schema: { type: 'object', properties: { code: { type: 'string', description: 'Python code to execute' } }, required: ['code'] } })
      }
    } else if (typeof tool === 'object' && tool.name) {
      // Custom tool
      defs.push({
        name: tool.name,
        description: tool.description || '',
        input_schema: tool.parameters || tool.input_schema || { type: 'object', properties: {} }
      })
      customTools.push(tool)
    }
  }
  
  return { defs, customTools }
}

function findToolContractSpec(name, { customTools = [], toolDefs = [] } = {}) {
  const toolName = stringifyPromptText(name)
  const registered = toolRegistry.get(toolName)
  if (registered) return registered
  const custom = customTools.find(t => t?.name === toolName)
  if (custom) return custom
  const def = toolDefs.find(t => t?.name === toolName)
  if (def) return def
  return null
}

function schemaForToolSpec(spec = {}) {
  return spec.parameters || spec.input_schema || spec.inputSchema || null
}

async function executeTool(name, input, config) {
  // ─── Required argument validation ───
  // Catch empty/missing required params before entering execute.
  // Returns a structured error the model can immediately act on.
  const spec = toolRegistry.get(name) || (config.customTools || []).find(t => t.name === name);
  const schema = schemaForToolSpec(spec)
  if (schema) {
    const missing = validateRequiredArgs(schema, input);
    if (missing) return missing;
  }

  // Build context object passed as second argument to tool execute functions.
  // This gives tools access to signal, session info, and other runtime state
  // without polluting the input schema.
  const toolContext = {
    signal: config.signal,
    toolName: name,
    ...(config.toolContext || {}),
  }

  // Check registry first
  const registered = toolRegistry.get(name)
  if (registered && registered.execute) {
    const result = registered.execute(input, toolContext)
    // Streaming tool: returns async generator
    if (result && typeof result[Symbol.asyncIterator] === 'function') {
      return result // caller handles iteration
    }
    return await result
  }
  
  // Check custom tools
  if (config.customTools) {
    const custom = config.customTools.find(t => t.name === name)
    if (custom && custom.execute) {
      const result = custom.execute(input, toolContext)
      if (result && typeof result[Symbol.asyncIterator] === 'function') {
        return result
      }
      return await result
    }
  }
  
  // Built-in tools
  if (name === 'search') return await searchWeb(input.query, config.searchApiKey)
  if (name === 'execute_code') return { output: '[Code execution not available in browser]' }
  
  return { error: 'Unknown tool' }
}

async function searchWeb(query, apiKey) {
  if (!apiKey) return { error: 'Search API key required' }
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey, query, max_results: 5 })
  })
  const data = await response.json()
  return { results: data.results || [] }
}

// ── Schema Mode (Structured Output) ──

async function schemaAsk(prompt, config, emit) {
  const { provider = 'anthropic', baseUrl, apiKey, model, history, proxyUrl, schema, retries = 2, images, outputMaxTokens, maxTokens, modelGatewayPriority, modelGatewaySource, modelGatewaySilent, modelGatewayRequestId, modelGatewayMaxWaitMs, modelGatewayConcurrency, modelGatewayOnStatus } = config
  
  const schemaStr = JSON.stringify(schema, null, 2)
  const systemPrompt = `You must respond with valid JSON that matches this schema:\n${schemaStr}\n\nRules:\n- Output ONLY the JSON object, no markdown, no explanation, no code fences\n- All required fields must be present\n- Types must match exactly`
  
  // Build user content — support vision images
  let userContent = systemPrompt + '\n\n' + prompt
  if (images?.length) {
    const content = []
    for (const img of images) {
      if (provider === 'anthropic') {
        content.push({ type: 'image', source: { type: 'base64', media_type: img.media_type || 'image/jpeg', data: img.data } })
      } else {
        const url = img.url || `data:${img.media_type || 'image/jpeg'};base64,${img.data}`
        content.push({ type: 'image_url', image_url: { url, detail: img.detail || 'auto' } })
      }
    }
    content.push({ type: 'text', text: systemPrompt + '\n\n' + prompt })
    userContent = content
  }
  
  const messages = []
  if (history?.length) messages.push(...history)
  messages.push({ role: 'user', content: prompt })
  
  let lastError = null
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      console.log(`[schema] Retry ${attempt}/${retries}: ${lastError}`)
      emit('status', { message: `Retry ${attempt}/${retries}...` })
      // Add error feedback for retry
      messages.push({ role: 'assistant', content: lastError.raw })
      messages.push({ role: 'user', content: `That JSON was invalid: ${lastError.message}\n\nPlease fix and return ONLY valid JSON matching the schema.` })
    }
    
    emit('status', { message: attempt === 0 ? 'Generating structured output...' : `Retry ${attempt}/${retries}...` })
    
    const chatFn = provider === 'anthropic' ? anthropicChat : provider === 'openai-responses' ? openaiResponsesChat : openaiChat
    const response = await chatFn({
      messages: [{ role: 'user', content: userContent }],
      tools: [], model, baseUrl, apiKey, proxyUrl, stream: false, emit, outputMaxTokens, maxTokens,
      modelGatewayPriority,
      modelGatewaySource: modelGatewaySource || 'schema',
      modelGatewaySilent,
      modelGatewayRequestId,
      modelGatewayMaxWaitMs,
      modelGatewayConcurrency,
      modelGatewayOnStatus,
    })
    
    const raw = response.content.trim()
    
    // Try to extract JSON (handle markdown fences)
    let jsonStr = raw
    const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
    if (fenceMatch) jsonStr = fenceMatch[1].trim()
    
    // Parse
    let parsed
    try {
      parsed = JSON.parse(jsonStr)
    } catch (e) {
      lastError = { message: `JSON parse error: ${e.message}`, raw }
      continue
    }
    
    // Validate against schema
    const validation = validateSchema(parsed, schema)
    if (!validation.valid) {
      lastError = { message: validation.error, raw }
      continue
    }
    
    // Success
    return { answer: raw, data: parsed, attempts: attempt + 1 }
  }
  
  // All retries exhausted
  throw new Error(`Schema validation failed after ${retries + 1} attempts: ${lastError.message}`)
}

function validateSchema(data, schema) {
  if (!schema || !schema.type) return { valid: true }
  
  // Type check
  if (schema.type === 'object') {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return { valid: false, error: `Expected object, got ${Array.isArray(data) ? 'array' : typeof data}` }
    }
    // Required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in data)) {
          return { valid: false, error: `Missing required field: "${field}"` }
        }
      }
    }
    // Property types
    if (schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        if (key in data && data[key] !== null && data[key] !== undefined) {
          const val = data[key]
          if (prop.type === 'string' && typeof val !== 'string') return { valid: false, error: `Field "${key}" should be string, got ${typeof val}` }
          if (prop.type === 'number' && typeof val !== 'number') return { valid: false, error: `Field "${key}" should be number, got ${typeof val}` }
          if (prop.type === 'boolean' && typeof val !== 'boolean') return { valid: false, error: `Field "${key}" should be boolean, got ${typeof val}` }
          if (prop.type === 'array' && !Array.isArray(val)) return { valid: false, error: `Field "${key}" should be array, got ${typeof val}` }
          // Enum check
          if (prop.enum && !prop.enum.includes(val)) return { valid: false, error: `Field "${key}" must be one of: ${prop.enum.join(', ')}` }
        }
      }
    }
  } else if (schema.type === 'array') {
    if (!Array.isArray(data)) return { valid: false, error: `Expected array, got ${typeof data}` }
  } else if (schema.type === 'string') {
    if (typeof data !== 'string') return { valid: false, error: `Expected string, got ${typeof data}` }
  } else if (schema.type === 'number') {
    if (typeof data !== 'number') return { valid: false, error: `Expected number, got ${typeof data}` }
  }
  
  return { valid: true }
}

// ── Tool Registry ──

/**
 * Validate that required arguments are present before tool execution.
 * Returns a structured error object if validation fails, null otherwise.
 */
function validateRequiredArgs(schema, input) {
  if (!schema || schema.type !== 'object') return null;
  const required = schema.required;
  if (!Array.isArray(required) || required.length === 0) return null;
  const args = input && typeof input === 'object' ? input : {};
  const missing = required.filter(key => {
    const val = args[key];
    return val === undefined || val === null || val === '';
  });
  if (missing.length === 0) return null;
  const props = schema.properties || {};
  const hints = missing.map(key => {
    const p = props[key] || {};
    const type = p.type || 'string';
    const desc = p.description ? ` — ${p.description}` : '';
    return `  • ${key} (${type})${desc}`;
  });
  return {
    error: `Missing required parameter${missing.length > 1 ? 's' : ''}:\n${hints.join('\n')}`,
    is_error: true,
  };
}

const toolRegistry = {
  _tools: new Map(),
  
  register(name, tool) {
    if (!name || typeof name !== 'string') throw new Error('Tool name required')
    if (!tool || typeof tool !== 'object') throw new Error('Tool must be an object')
    if (!tool.description) throw new Error('Tool description required')
    if (!tool.execute || typeof tool.execute !== 'function') throw new Error('Tool execute function required')
    
    this._tools.set(name, {
      name,
      description: tool.description,
      parameters: tool.parameters || { type: 'object', properties: {} },
      execute: tool.execute,
      streaming: !!tool.streaming,
    })
  },
  
  unregister(name) {
    this._tools.delete(name)
  },
  
  get(name) {
    return this._tools.get(name)
  },
  
  list(category) {
    const tools = Array.from(this._tools.values())
    if (!category) return tools
    return tools.filter(t => t.category === category)
  },
  
  clear() {
    this._tools.clear()
  }
}

// ── Audio: TTS (synthesize) ─────────────────────────────────────

async function synthesize(text, config = {}) {
  const {
    provider = 'openai',
    baseUrl = 'https://api.openai.com',
    apiKey,
    proxyUrl,
    model = 'tts-1',
    voice = 'alloy',
    format = 'mp3',
  } = config

  if (!apiKey) throw new Error('API key required for TTS')
  if (!text?.trim()) return null

  // ElevenLabs
  if (provider === 'elevenlabs') {
    const voiceId = voice
    const modelId = model || 'eleven_turbo_v2_5'
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`
    const res = await _audioFetch(url, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model_id: modelId, voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
    })
    return res.arrayBuffer()
  }

  // OpenAI-compatible (default) — works with agentic-service too
  const base = (baseUrl || '').replace(/\/+$/, '').replace(/\/v1$/, '')
  const url = `${base}/v1/audio/speech`
  const targetUrl = proxyUrl || url
  const headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
  if (proxyUrl) headers['X-Target-URL'] = url

  const res = await _audioFetch(targetUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model, voice, input: text, response_format: format }),
  })
  return res.arrayBuffer()
}

// ── Audio: STT (transcribe) ─────────────────────────────────────

async function transcribe(audio, config = {}) {
  const {
    provider = 'openai',
    baseUrl = 'https://api.openai.com',
    apiKey,
    proxyUrl,
    model = 'whisper-1',
    language = 'zh',
    timestamps = false,
  } = config

  if (!apiKey) throw new Error('API key required for STT')

  // ElevenLabs
  if (provider === 'elevenlabs') {
    const modelId = model || 'scribe_v2'
    const url = 'https://api.elevenlabs.io/v1/speech-to-text'
    const form = _buildAudioForm(audio, 'audio.wav', 'audio/wav')
    form.append('model_id', modelId)
    const res = await _audioFetch(url, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
      body: form,
    })
    const data = await res.json()
    return timestamps ? data : (data.text?.trim() || '')
  }

  // OpenAI-compatible (default)
  const base = (baseUrl || '').replace(/\/+$/, '').replace(/\/v1$/, '')
  const url = `${base}/v1/audio/transcriptions`
  const targetUrl = proxyUrl || url
  const form = _buildAudioForm(audio, 'audio.wav', 'audio/wav')
  form.append('model', model)
  if (language) form.append('language', language.split('-')[0])
  if (timestamps) {
    form.append('response_format', 'verbose_json')
    form.append('timestamp_granularities[]', 'word')
  }

  const headers = { 'Authorization': `Bearer ${apiKey}` }
  if (proxyUrl) headers['X-Target-URL'] = url

  const res = await _audioFetch(targetUrl, { method: 'POST', headers, body: form })
  const data = await res.json()
  return timestamps ? data : (data.text?.trim() || '')
}

// ── Audio helpers ───────────────────────────────────────────────

function _buildAudioForm(audio, filename, mimeType) {
  // Node.js Buffer → Blob
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(audio)) {
    const blob = new Blob([audio], { type: mimeType })
    const form = new FormData()
    form.append('file', blob, filename)
    return form
  }
  // ArrayBuffer → Blob
  if (audio instanceof ArrayBuffer || (audio?.buffer instanceof ArrayBuffer)) {
    const blob = new Blob([audio], { type: mimeType })
    const form = new FormData()
    form.append('file', blob, filename)
    return form
  }
  // Already a Blob/File
  if (audio instanceof Blob) {
    const form = new FormData()
    form.append('file', audio, filename)
    return form
  }
  // File path (string, Node.js only)
  if (typeof audio === 'string' && typeof require === 'function') {
    const fs = require('fs')
    const buf = fs.readFileSync(audio)
    const blob = new Blob([buf], { type: mimeType })
    const form = new FormData()
    form.append('file', blob, filename)
    return form
  }
  throw new Error('Unsupported audio input type')
}

async function _audioFetch(url, opts, retries = 3) {
  let lastErr
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, opts)
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Audio API ${res.status}: ${text.slice(0, 300)}`)
      }
      return res
    } catch (err) {
      lastErr = err
      if (i < retries - 1) await new Promise(r => setTimeout(r, 500 * (i + 1)))
    }
  }
  throw lastErr
}

// ── Warmup: pre-heat connection + prompt cache ──
async function warmup(config = {}) {
  const { provider = 'anthropic', apiKey, baseUrl, model, system, tools = [], proxyUrl, providers, modelGatewayPriority, modelGatewaySource, modelGatewaySilent, modelGatewayRequestId, modelGatewayMaxWaitMs, modelGatewayConcurrency, modelGatewayOnStatus } = config
  if (!apiKey && (!providers || !providers.length)) {
    console.warn('[warmup] No API key, skipping')
    return { ok: false, reason: 'no_api_key' }
  }

  const t0 = Date.now()
  const { defs: toolDefs } = buildToolDefs(tools)

  // Build minimal request: system + tools + trivial prompt, max_tokens=1
  const warmupSystem = toolDefs.length > 0
    ? (system ? EAGER_HINT + '\n\n' + system : EAGER_HINT)
    : system

  try {
    if (provider === 'anthropic') {
      const base = (baseUrl || 'https://api.anthropic.com').replace(/\/+$/, '')
      const url = base.endsWith('/v1') ? `${base}/messages` : `${base}/v1/messages`
      const headers = {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31'
      }
      const body = {
        model: model || 'claude-sonnet-4',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
        stream: false,
      }
      applyAnthropicPromptCaching(body, { system: warmupSystem, tools: toolDefs })

      const fetchUrl = proxyUrl || url
      const fetchHeaders = proxyUrl
        ? { ...headers, 'x-base-url': baseUrl || 'https://api.anthropic.com', 'x-provider': 'anthropic' }
        : headers
      const fetchBody = JSON.stringify(body)

      const resp = await modelFetch(fetchUrl, {
        method: 'POST',
        headers: fetchHeaders,
        body: fetchBody,
      }, gatewayMeta({
        provider: 'anthropic',
        model: body.model,
        baseUrl: baseUrl || 'https://api.anthropic.com',
        apiKey,
        proxyUrl,
        modelGatewayPriority: modelGatewayPriority || 'background',
        modelGatewaySource: modelGatewaySource || 'warmup',
        modelGatewaySilent: modelGatewaySilent !== false,
        modelGatewayRequestId,
        modelGatewayMaxWaitMs,
        modelGatewayConcurrency,
        modelGatewayOnStatus,
      }, { url: fetchUrl, requestBytes: byteLength(fetchBody) }))
      const data = await resp.json()
      const ms = Date.now() - t0
      const cacheCreated = data.usage?.cache_creation_input_tokens || 0
      const cacheHit = data.usage?.cache_read_input_tokens || 0
      console.log(`[warmup] Anthropic ${ms}ms — cache_created: ${cacheCreated}, cache_hit: ${cacheHit}`)
      return { ok: true, ms, cacheCreated, cacheHit, provider: 'anthropic' }
    } else {
      // OpenAI-compatible: just do a connection warmup (no prompt caching)
      const base = (baseUrl || 'https://api.openai.com').replace(/\/+$/, '')
      const url = base.includes('/v1') ? `${base}/chat/completions` : `${base}/v1/chat/completions`
      const body = {
        model: model || 'gpt-4',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
        stream: false,
      }
      const fetchBody = JSON.stringify(body)
      const resp = await modelFetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'authorization': `Bearer ${apiKey}` },
        body: fetchBody,
      }, gatewayMeta({
        provider: 'openai',
        model: body.model,
        baseUrl: baseUrl || 'https://api.openai.com',
        apiKey,
        proxyUrl,
        modelGatewayPriority: modelGatewayPriority || 'background',
        modelGatewaySource: modelGatewaySource || 'warmup',
        modelGatewaySilent: modelGatewaySilent !== false,
        modelGatewayRequestId,
        modelGatewayMaxWaitMs,
        modelGatewayConcurrency,
        modelGatewayOnStatus,
      }, { url, requestBytes: byteLength(fetchBody) }))
      await resp.json()
      const ms = Date.now() - t0
      console.log(`[warmup] OpenAI ${ms}ms (connection only)`)
      return { ok: true, ms, provider: 'openai' }
    }
  } catch (err) {
    const ms = Date.now() - t0
    console.warn(`[warmup] Failed in ${ms}ms:`, err.message)
    return { ok: false, ms, error: err.message }
  }
}

// ── agenticStep: single-turn LLM call, caller controls tool loop ──
// Returns { text, toolCalls, messages, done } — caller executes tools and calls step() again
async function agenticStep(messages, config) {
  const { provider = 'anthropic', baseUrl, apiKey, model, tools = [], proxyUrl, stream = false, system, signal, providers, outputMaxTokens, maxTokens, emit: emitFn, modelGatewayPriority, modelGatewaySource, modelGatewaySilent, modelGatewayRequestId, modelGatewayMaxWaitMs, modelGatewayConcurrency, modelGatewayOnStatus } = config
  const modelGateway = { modelGatewayPriority, modelGatewaySource, modelGatewaySilent, modelGatewayRequestId, modelGatewayMaxWaitMs, modelGatewayConcurrency, modelGatewayOnStatus }

  if (!apiKey && (!providers || !providers.length)) throw new Error('API Key required')

  // Build tool defs from tool objects (same format as think() tools)
  // tools can be: array of {name, description, input_schema, execute} or string names
  let toolDefs = []
  if (tools.length > 0 && typeof tools[0] === 'object' && tools[0].name) {
    // Custom tool objects — convert to provider format
    toolDefs = tools.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema || { type: 'object', properties: {} }
    }))
  } else if (tools.length > 0 && typeof tools[0] === 'string') {
    // Built-in tool names — use buildToolDefs
    const built = buildToolDefs(tools)
    toolDefs = built.defs
  }

  const emit = emitFn || (() => {})
  let response
  let text = ''

  if (stream) {
    // Streaming: yield tokens, collect response
    try {
      const streamGen = _streamCallWithFailover({ messages, tools: toolDefs, model, baseUrl, apiKey, proxyUrl, system, provider, signal, providers, outputMaxTokens, maxTokens, ...modelGateway })
      for await (const evt of streamGen) {
        if (evt.type === 'text_delta') {
          text += evt.text
          emit('token', { text: evt.text })
        } else if (evt.type === 'response') {
          response = evt
        }
      }
    } catch (err) {
      throw err
    }
  } else {
    try {
      response = await _callWithFailover({ messages, tools: toolDefs, model, baseUrl, apiKey, proxyUrl, stream: false, system, provider, signal, providers, outputMaxTokens, maxTokens, ...modelGateway })
      text = response.content || ''
    } catch (err) {
      throw err
    }
  }

  const toolCalls = response.tool_calls || []
  const done = ['end_turn', 'stop'].includes(response.stop_reason) || toolCalls.length === 0

  // Build updated messages array (append assistant message)
  const updatedMessages = [...messages]
  if (toolCalls.length > 0) {
    updatedMessages.push({ role: 'assistant', content: text || '', tool_calls: toolCalls })
  } else if (text) {
    updatedMessages.push({ role: 'assistant', content: text })
  }

  return {
    text,
    toolCalls: toolCalls.map(tc => ({ id: tc.id, name: tc.name, input: tc.input })),
    messages: updatedMessages,
    done,
    stopReason: response.stop_reason
  }
}

// Helper: build tool result message for pushing back into messages after executing tools
function buildToolResults(toolCalls, results) {
  return toolCalls.map((tc, i) => {
    const result = results[i]
    if (result && Array.isArray(result.blocks)) {
      // Caller already normalised via normalizeToolResultBlocks
      return {
        role: 'tool',
        tool_call_id: tc.id,
        blocks: result.blocks,
        is_error: !!result.is_error,
        content: result.content || JSON.stringify(result.output ?? { blocks: result.blocks }),
      }
    }
    const content = result?.error
      ? JSON.stringify({ error: result.error })
      : JSON.stringify(result?.output ?? result)
    return { role: 'tool', tool_call_id: tc.id, content, is_error: !!result?.error }
  })
}

// Async variant that performs full normalisation (reads files, validates sizes, etc.).
// Prefer this when tools may return structured blocks or file paths.
async function buildToolResultsAsync(toolCalls, results, options) {
  const out = []
  for (let i = 0; i < toolCalls.length; i++) {
    const tc = toolCalls[i]
    const r = results[i]
    const source = r?.error ? { error: r.error } : (r?.output ?? r)
    const { blocks, is_error } = await normalizeToolResultBlocks(source, options)
    out.push({
      role: 'tool',
      tool_call_id: tc.id,
      blocks,
      is_error,
      content: JSON.stringify(r?.error ? { error: r.error } : (r?.output ?? r ?? null)),
    })
  }
  return out
}

// ── chat: unified messages-first API ──
// chat(messages, opts) → AsyncGenerator<ChatEvent>
// stream (default true) is just an option, not a separate function.
// When stream=false, still returns generator but buffers internally.
//
// Usage:
//   for await (const e of chat(messages, { system, tools, stream: true })) { ... }
//   const result = await chatResult(messages, opts) // convenience wrapper

function chat(messages, opts = {}) {
  const { system, tools, stream = true, provider, apiKey, baseUrl, model, proxyUrl, signal, providers, images, audio, schema, searchApiKey, outputMaxTokens, maxTokens, modelRequestLifecycle, modelRequestFirstEventTimeoutMs, modelStreamIdleTimeoutMs, modelGatewayPriority, modelGatewaySource, modelGatewaySilent, modelGatewayRequestId, modelGatewayMaxWaitMs, modelGatewayConcurrency, modelGatewayOnStatus } = opts

  // Extract last user message as prompt, rest as history
  const lastMsg = messages[messages.length - 1]
  const prompt = typeof lastMsg?.content === 'string' ? lastMsg.content : JSON.stringify(lastMsg?.content || '')
  const history = messages.slice(0, -1)

  const config = {
    provider, apiKey, baseUrl, model, proxyUrl, signal, providers,
    history, system, tools, stream, images, audio, schema, searchApiKey, outputMaxTokens, maxTokens,
    modelRequestLifecycle, modelRequestFirstEventTimeoutMs, modelStreamIdleTimeoutMs,
    modelGatewayPriority, modelGatewaySource, modelGatewaySilent, modelGatewayRequestId, modelGatewayMaxWaitMs, modelGatewayConcurrency, modelGatewayOnStatus,
  }

  // Clean undefined values
  for (const k of Object.keys(config)) {
    if (config[k] === undefined) delete config[k]
  }

  return _agenticAskGen(prompt, config)
}

// Convenience: await chatResult(messages, opts) → { answer, tool_calls, usage, rounds }
async function chatResult(messages, opts = {}) {
  let answer = '', toolCalls = [], usage, rounds = 0
  for await (const event of chat(messages, opts)) {
    if (event.type === 'done') {
      answer = event.answer || ''
      rounds = event.rounds || 0
      usage = event.usage
    } else if (event.type === 'tool_use') {
      toolCalls.push({ id: event.id, name: event.name, input: event.input })
    }
  }
  return { answer, tool_calls: toolCalls, usage, rounds }
}

export { agenticAsk, agenticStep, buildToolResults, buildToolResultsAsync, normalizeToolResultBlocks, warmup, classifyError, toolRegistry, validateRequiredArgs, synthesize, transcribe, registerProvider, unregisterProvider, chat, chatResult }
