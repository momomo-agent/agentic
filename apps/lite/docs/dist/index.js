import "./chunk-2S46JIHY.js";
import "./chunk-4TMNWLGU.js";
import "./chunk-6WLUD5RB.js";
import {
  AgenticStoreBackend
} from "./chunk-MIGVFB2G.js";
import {
  MemoryStorage
} from "./chunk-DDGXLPYE.js";
import {
  IOError,
  NotFoundError,
  PermissionDeniedError,
  __commonJS,
  __toESM
} from "./chunk-JYFXRBIL.js";

// node_modules/.pnpm/agentic-core@file+..+agentic-core/node_modules/agentic-core/agentic-core.js
var require_agentic_core = __commonJS({
  "node_modules/.pnpm/agentic-core@file+..+agentic-core/node_modules/agentic-core/agentic-core.js"(exports, module) {
    "use strict";
    (function(root, factory) {
      if (typeof module === "object" && module.exports) module.exports = factory();
      else if (typeof define === "function" && define.amd) define(factory);
      else {
        var e = factory();
        root.AgenticCore = e;
        for (var k in e) root[k] = e[k];
      }
    })(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : exports, function() {
      "use strict";
      const WARNING_THRESHOLD = 10;
      const CRITICAL_THRESHOLD = 20;
      const GLOBAL_CIRCUIT_BREAKER_THRESHOLD = 30;
      const TOOL_CALL_HISTORY_SIZE = 30;
      function simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i);
          hash = (hash << 5) - hash + char;
          hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
      }
      function stableStringify(value) {
        if (value === null || typeof value !== "object") return JSON.stringify(value);
        if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
        const keys = Object.keys(value).sort();
        return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
      }
      function hashToolCall(toolName, params) {
        return `${toolName}:${simpleHash(stableStringify(params))}`;
      }
      function hashToolOutcome(toolName, params, result, error) {
        if (error !== void 0) {
          return `error:${simpleHash(String(error))}`;
        }
        if (result === void 0) return void 0;
        let text = "";
        if (result && typeof result === "object" && Array.isArray(result.content)) {
          text = result.content.filter((e) => e && typeof e.type === "string" && typeof e.text === "string").map((e) => e.text).join("\n").trim();
        }
        const details = result && typeof result === "object" && result.details || {};
        if (isKnownPollToolCall(toolName, params)) {
          if (typeof params === "object" && params !== null) {
            const action = params.action;
            if (action === "poll") {
              return simpleHash(stableStringify({
                action,
                status: details.status,
                exitCode: details.exitCode ?? null,
                exitSignal: details.exitSignal ?? null,
                aggregated: details.aggregated ?? null,
                text
              }));
            }
            if (action === "log") {
              return simpleHash(stableStringify({
                action,
                status: details.status,
                totalLines: details.totalLines ?? null,
                totalChars: details.totalChars ?? null,
                truncated: details.truncated ?? null,
                exitCode: details.exitCode ?? null,
                exitSignal: details.exitSignal ?? null,
                text
              }));
            }
          }
        }
        return simpleHash(stableStringify({ details, text }));
      }
      function isKnownPollToolCall(toolName, params) {
        if (toolName === "command_status") return true;
        if (toolName !== "process" || typeof params !== "object" || params === null) return false;
        return params.action === "poll" || params.action === "log";
      }
      function getNoProgressStreak(history, toolName, argsHash) {
        let streak = 0;
        let latestResultHash = void 0;
        for (let i = history.length - 1; i >= 0; i--) {
          const record = history[i];
          if (!record || record.toolName !== toolName || record.argsHash !== argsHash) continue;
          if (typeof record.resultHash !== "string" || !record.resultHash) continue;
          if (!latestResultHash) {
            latestResultHash = record.resultHash;
            streak = 1;
            continue;
          }
          if (record.resultHash !== latestResultHash) break;
          streak++;
        }
        return { count: streak, latestResultHash };
      }
      function getPingPongStreak(history, currentHash) {
        const last = history[history.length - 1];
        if (!last) return { count: 0, noProgressEvidence: false };
        let otherSignature, otherToolName;
        for (let i = history.length - 2; i >= 0; i--) {
          const call = history[i];
          if (!call) continue;
          if (call.argsHash !== last.argsHash) {
            otherSignature = call.argsHash;
            otherToolName = call.toolName;
            break;
          }
        }
        if (!otherSignature || !otherToolName) return { count: 0, noProgressEvidence: false };
        let alternatingTailCount = 0;
        for (let i = history.length - 1; i >= 0; i--) {
          const call = history[i];
          if (!call) continue;
          const expected = alternatingTailCount % 2 === 0 ? last.argsHash : otherSignature;
          if (call.argsHash !== expected) break;
          alternatingTailCount++;
        }
        if (alternatingTailCount < 2) return { count: 0, noProgressEvidence: false };
        if (currentHash !== otherSignature) return { count: 0, noProgressEvidence: false };
        const tailStart = Math.max(0, history.length - alternatingTailCount);
        let firstHashA, firstHashB;
        let noProgressEvidence = true;
        for (let i = tailStart; i < history.length; i++) {
          const call = history[i];
          if (!call || !call.resultHash) {
            noProgressEvidence = false;
            break;
          }
          if (call.argsHash === last.argsHash) {
            if (!firstHashA) firstHashA = call.resultHash;
            else if (firstHashA !== call.resultHash) {
              noProgressEvidence = false;
              break;
            }
          } else if (call.argsHash === otherSignature) {
            if (!firstHashB) firstHashB = call.resultHash;
            else if (firstHashB !== call.resultHash) {
              noProgressEvidence = false;
              break;
            }
          } else {
            noProgressEvidence = false;
            break;
          }
        }
        if (!firstHashA || !firstHashB) noProgressEvidence = false;
        return {
          count: alternatingTailCount + 1,
          pairedToolName: last.toolName,
          pairedSignature: last.argsHash,
          noProgressEvidence
        };
      }
      function detectToolCallLoop(state, toolName, params) {
        const history = state.toolCallHistory || [];
        const currentHash = hashToolCall(toolName, params);
        const noProgress = getNoProgressStreak(history, toolName, currentHash);
        const noProgressStreak = noProgress.count;
        const knownPollTool = isKnownPollToolCall(toolName, params);
        const pingPong = getPingPongStreak(history, currentHash);
        if (noProgressStreak >= GLOBAL_CIRCUIT_BREAKER_THRESHOLD) {
          return {
            stuck: true,
            level: "critical",
            detector: "global_circuit_breaker",
            count: noProgressStreak,
            message: `CRITICAL: ${toolName} has repeated identical no-progress outcomes ${noProgressStreak} times. Session execution blocked by global circuit breaker to prevent runaway loops.`
          };
        }
        if (knownPollTool && noProgressStreak >= CRITICAL_THRESHOLD) {
          return {
            stuck: true,
            level: "critical",
            detector: "known_poll_no_progress",
            count: noProgressStreak,
            message: `CRITICAL: Called ${toolName} with identical arguments and no progress ${noProgressStreak} times. This appears to be a stuck polling loop. Session execution blocked to prevent resource waste.`
          };
        }
        if (knownPollTool && noProgressStreak >= WARNING_THRESHOLD) {
          return {
            stuck: true,
            level: "warning",
            detector: "known_poll_no_progress",
            count: noProgressStreak,
            message: `WARNING: You have called ${toolName} ${noProgressStreak} times with identical arguments and no progress. Stop polling and either (1) increase wait time between checks, or (2) report the task as failed if the process is stuck.`
          };
        }
        if (pingPong.count >= CRITICAL_THRESHOLD && pingPong.noProgressEvidence) {
          return {
            stuck: true,
            level: "critical",
            detector: "ping_pong",
            count: pingPong.count,
            message: `CRITICAL: You are alternating between repeated tool-call patterns (${pingPong.count} consecutive calls) with no progress. This appears to be a stuck ping-pong loop. Session execution blocked to prevent resource waste.`,
            pairedToolName: pingPong.pairedToolName
          };
        }
        if (pingPong.count >= WARNING_THRESHOLD) {
          return {
            stuck: true,
            level: "warning",
            detector: "ping_pong",
            count: pingPong.count,
            message: `WARNING: You are alternating between repeated tool-call patterns (${pingPong.count} consecutive calls). This looks like a ping-pong loop; stop retrying and report the task as failed.`,
            pairedToolName: pingPong.pairedToolName
          };
        }
        const recentCount = history.filter(
          (h) => h.toolName === toolName && h.argsHash === currentHash
        ).length;
        if (!knownPollTool && recentCount >= WARNING_THRESHOLD) {
          return {
            stuck: true,
            level: "warning",
            detector: "generic_repeat",
            count: recentCount,
            message: `WARNING: You have called ${toolName} ${recentCount} times with identical arguments. If this is not making progress, stop retrying and report the task as failed.`
          };
        }
        return { stuck: false };
      }
      function recordToolCall(state, toolName, params) {
        if (!state.toolCallHistory) state.toolCallHistory = [];
        state.toolCallHistory.push({
          toolName,
          argsHash: hashToolCall(toolName, params),
          timestamp: Date.now()
        });
        if (state.toolCallHistory.length > TOOL_CALL_HISTORY_SIZE) {
          state.toolCallHistory.shift();
        }
      }
      function recordToolCallOutcome(state, toolName, params, result, error) {
        if (!state.toolCallHistory) state.toolCallHistory = [];
        const argsHash = hashToolCall(toolName, params);
        const resultHash = hashToolOutcome(toolName, params, result, error);
        if (!resultHash) return;
        let matched = false;
        for (let i = state.toolCallHistory.length - 1; i >= 0; i--) {
          const call = state.toolCallHistory[i];
          if (!call || call.toolName !== toolName || call.argsHash !== argsHash) continue;
          if (call.resultHash !== void 0) continue;
          call.resultHash = resultHash;
          matched = true;
          break;
        }
        if (!matched) {
          state.toolCallHistory.push({
            toolName,
            argsHash,
            resultHash,
            timestamp: Date.now()
          });
        }
        if (state.toolCallHistory.length > TOOL_CALL_HISTORY_SIZE) {
          state.toolCallHistory.splice(0, state.toolCallHistory.length - TOOL_CALL_HISTORY_SIZE);
        }
      }
      const MAX_ROUNDS = 200;
      async function agenticAsk2(prompt, config, emit) {
        try {
          return await _agenticAsk(prompt, config, emit);
        } catch (e) {
          throw e instanceof Error ? e : new Error(String(e));
        }
      }
      async function _agenticAsk(prompt, config, emit) {
        const { provider = "anthropic", baseUrl, apiKey, model, tools = ["search", "code"], searchApiKey, history, proxyUrl, stream = true, schema, retries = 2, system, images } = config;
        if (!apiKey) throw new Error("API Key required");
        if (schema) {
          return await schemaAsk(prompt, config, emit);
        }
        const { defs: toolDefs, customTools } = buildToolDefs(tools);
        const messages = [];
        if (history?.length) {
          messages.push(...history);
        }
        if (config.customUserContent) {
          messages.push({ role: "user", content: config.customUserContent });
        } else if (images?.length) {
          const content = [];
          for (const img of images) {
            if (provider === "anthropic") {
              content.push({ type: "image", source: { type: "base64", media_type: img.media_type || "image/jpeg", data: img.data } });
            } else {
              const url = img.url || `data:${img.media_type || "image/jpeg"};base64,${img.data}`;
              content.push({ type: "image_url", image_url: { url, detail: img.detail || "low" } });
            }
          }
          content.push({ type: "text", text: prompt });
          messages.push({ role: "user", content });
        } else {
          messages.push({ role: "user", content: prompt });
        }
        let round = 0;
        let finalAnswer = null;
        const state = { toolCallHistory: [] };
        console.log("[agenticAsk] Starting with prompt:", prompt.slice(0, 50));
        console.log("[agenticAsk] Tools available:", tools, "Stream:", stream);
        console.log("[agenticAsk] Provider:", provider);
        while (round < MAX_ROUNDS) {
          round++;
          console.log(`
[Round ${round}] Calling LLM...`);
          emit("status", { message: `Round ${round}/${MAX_ROUNDS}` });
          const isStreamRound = stream && (provider === "anthropic" || !toolDefs.length || round > 1);
          const chatFn = provider === "anthropic" ? anthropicChat : openaiChat;
          const response = await chatFn({ messages, tools: toolDefs, model, baseUrl, apiKey, proxyUrl, stream: isStreamRound, emit, system });
          console.log(`[Round ${round}] LLM Response:`);
          console.log(`  - stop_reason: ${response.stop_reason}`);
          console.log(`  - content:`, response.content);
          console.log(`  - tool_calls: ${response.tool_calls?.length || 0}`);
          if (["end_turn", "stop"].includes(response.stop_reason) || !response.tool_calls?.length) {
            console.log(`[Round ${round}] Done: stop_reason=${response.stop_reason}, tool_calls=${response.tool_calls?.length || 0}`);
            finalAnswer = response.content;
            break;
          }
          console.log(`[Round ${round}] Executing ${response.tool_calls.length} tool calls...`);
          messages.push({ role: "assistant", content: response.content, tool_calls: response.tool_calls });
          for (const call of response.tool_calls) {
            console.log(`[Round ${round}] Tool: ${call.name}, Input:`, call.input);
            recordToolCall(state, call.name, call.input);
            const loopDetection = detectToolCallLoop(state, call.name, call.input);
            if (loopDetection.stuck) {
              console.log(`[Round ${round}] Loop detected: ${loopDetection.detector} (${loopDetection.level})`);
              emit("warning", { level: loopDetection.level, message: loopDetection.message });
              if (loopDetection.level === "critical") {
                finalAnswer = `[Loop Detection] ${loopDetection.message}`;
                break;
              }
              messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify({ error: `LOOP_DETECTED: ${loopDetection.message}` }) });
              continue;
            }
            emit("tool", { name: call.name, input: call.input });
            const result = await executeTool(call.name, call.input, { searchApiKey, customTools });
            console.log(`[Round ${round}] Tool result:`, result);
            recordToolCallOutcome(state, call.name, call.input, result, null);
            messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
          }
          if (finalAnswer) break;
        }
        console.log(`
[agenticAsk] Loop ended at round ${round}`);
        if (!finalAnswer) {
          console.log("[agenticAsk] Generating final answer (no tools)...");
          emit("status", { message: "Generating final answer..." });
          const chatFn = provider === "anthropic" ? anthropicChat : openaiChat;
          const finalResponse = await chatFn({ messages, tools: [], model, baseUrl, apiKey, proxyUrl, stream, emit, system });
          finalAnswer = finalResponse.content || "(no response)";
          console.log("[agenticAsk] Final answer:", finalAnswer.slice(0, 100));
        }
        console.log("[agenticAsk] Complete. Total rounds:", round);
        return { answer: finalAnswer, rounds: round, messages };
      }
      async function anthropicChat({ messages, tools, model = "claude-sonnet-4", baseUrl = "https://api.anthropic.com", apiKey, proxyUrl, stream = false, emit, system }) {
        const base = baseUrl.replace(/\/+$/, "");
        const url = base.endsWith("/v1") ? `${base}/messages` : `${base}/v1/messages`;
        const anthropicMessages = [];
        for (const m of messages) {
          if (m.role === "user") {
            anthropicMessages.push({ role: "user", content: m.content });
          } else if (m.role === "assistant") {
            if (m.tool_calls?.length) {
              const blocks = [];
              if (m.content) blocks.push({ type: "text", text: m.content });
              for (const tc of m.tool_calls) {
                blocks.push({ type: "tool_use", id: tc.id, name: tc.name, input: tc.input });
              }
              anthropicMessages.push({ role: "assistant", content: blocks });
            } else {
              anthropicMessages.push({ role: "assistant", content: m.content });
            }
          } else if (m.role === "tool") {
            const toolResult = { type: "tool_result", tool_use_id: m.tool_call_id, content: m.content };
            const last = anthropicMessages[anthropicMessages.length - 1];
            if (last?.role === "user" && Array.isArray(last.content) && last.content[0]?.type === "tool_result") {
              last.content.push(toolResult);
            } else {
              anthropicMessages.push({ role: "user", content: [toolResult] });
            }
          }
        }
        const body = {
          model,
          max_tokens: 4096,
          messages: anthropicMessages,
          stream
        };
        if (system) body.system = system;
        if (tools?.length) body.tools = tools;
        const headers = { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" };
        if (stream && !proxyUrl) {
          return await streamAnthropic(url, headers, body, emit);
        }
        if (stream && proxyUrl) {
          const proxyHeaders = { ...headers, "x-base-url": baseUrl || "https://api.anthropic.com", "x-provider": "anthropic" };
          return await streamAnthropic(proxyUrl, proxyHeaders, body, emit);
        }
        const response = await callLLM(url, apiKey, body, proxyUrl, true);
        const text = response.content.find((c) => c.type === "text")?.text || "";
        return {
          content: text,
          tool_calls: response.content.filter((c) => c.type === "tool_use").map((t) => ({
            id: t.id,
            name: t.name,
            input: t.input
          })),
          stop_reason: response.stop_reason
        };
      }
      async function openaiChat({ messages, tools, model = "gpt-4", baseUrl = "https://api.openai.com", apiKey, proxyUrl, stream = false, emit, system }) {
        const base = baseUrl.replace(/\/+$/, "");
        const url = base.includes("/v1") ? `${base}/chat/completions` : `${base}/v1/chat/completions`;
        const oaiMessages = system ? [{ role: "system", content: system }, ...messages] : messages;
        const body = { model, messages: oaiMessages, stream };
        if (tools?.length) body.tools = tools.map((t) => ({ type: "function", function: t }));
        const headers = { "content-type": "application/json", "authorization": `Bearer ${apiKey}` };
        if (stream && !proxyUrl) {
          return await streamOpenAI(url, headers, body, emit);
        }
        if (stream && proxyUrl) {
          const proxyHeaders = { ...headers, "x-base-url": baseUrl || "https://api.openai.com", "x-provider": "openai", "x-api-key": apiKey };
          return await streamOpenAI(proxyUrl, proxyHeaders, body, emit);
        }
        const response = await callLLM(url, apiKey, body, proxyUrl, false);
        if (typeof response === "string" && response.includes("chat.completion.chunk")) {
          return parseSSEResponse(response);
        }
        const choice = response.choices?.[0];
        if (!choice) return { content: "", tool_calls: [], stop_reason: "stop" };
        const text = choice.message?.content || "";
        return {
          content: text,
          tool_calls: choice.message?.tool_calls?.map((t) => {
            let input = {};
            try {
              input = JSON.parse(t.function.arguments || "{}");
            } catch {
            }
            return { id: t.id, name: t.function.name, input };
          }) || [],
          stop_reason: choice.finish_reason
        };
      }
      async function streamAnthropic(url, headers, body, emit) {
        const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
        if (!res.ok) {
          const err = await res.text();
          throw new Error(`API error ${res.status}: ${err.slice(0, 300)}`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let content = "";
        let toolCalls = [];
        let currentToolInput = "";
        let currentTool = null;
        let stopReason = "end_turn";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const event = JSON.parse(data);
              if (event.type === "content_block_delta") {
                if (event.delta?.type === "text_delta") {
                  content += event.delta.text;
                  emit("token", { text: event.delta.text });
                } else if (event.delta?.type === "input_json_delta") {
                  currentToolInput += event.delta.partial_json || "";
                }
              } else if (event.type === "content_block_start") {
                if (event.content_block?.type === "tool_use") {
                  currentTool = { id: event.content_block.id, name: event.content_block.name };
                  currentToolInput = "";
                }
              } else if (event.type === "content_block_stop") {
                if (currentTool) {
                  let input = {};
                  try {
                    input = JSON.parse(currentToolInput || "{}");
                  } catch {
                  }
                  toolCalls.push({ ...currentTool, input });
                  currentTool = null;
                  currentToolInput = "";
                }
              } else if (event.type === "message_delta") {
                if (event.delta?.stop_reason) stopReason = event.delta.stop_reason;
              }
            } catch {
            }
          }
        }
        return { content, tool_calls: toolCalls, stop_reason: stopReason };
      }
      async function streamOpenAI(url, headers, body, emit) {
        const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
        if (!res.ok) {
          const err = await res.text();
          throw new Error(`API error ${res.status}: ${err.slice(0, 300)}`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let content = "";
        let toolCalls = {};
        let finishReason = "stop";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const chunk = JSON.parse(data);
              const delta = chunk.choices?.[0]?.delta;
              if (!delta) continue;
              if (delta.content) {
                content += delta.content;
                emit("token", { text: delta.content });
              }
              if (chunk.choices?.[0]?.finish_reason) {
                finishReason = chunk.choices[0].finish_reason;
              }
              if (delta.tool_calls) {
                for (const tc of delta.tool_calls) {
                  if (!toolCalls[tc.index]) toolCalls[tc.index] = { id: "", name: "", arguments: "" };
                  if (tc.id) toolCalls[tc.index].id = tc.id;
                  if (tc.function?.name) toolCalls[tc.index].name = tc.function.name;
                  if (tc.function?.arguments) toolCalls[tc.index].arguments += tc.function.arguments;
                }
              }
            } catch {
            }
          }
        }
        const tcList = Object.values(toolCalls).filter((t) => t.name).map((t) => {
          let input = {};
          try {
            input = JSON.parse(t.arguments || "{}");
          } catch {
          }
          return { id: t.id, name: t.name, input };
        });
        return { content, tool_calls: tcList, stop_reason: finishReason };
      }
      async function callLLM(url, apiKey, body, proxyUrl, isAnthropic = false) {
        const headers = { "content-type": "application/json" };
        if (isAnthropic) {
          headers["x-api-key"] = apiKey;
          headers["anthropic-version"] = "2023-06-01";
        } else {
          headers["authorization"] = `Bearer ${apiKey}`;
        }
        if (proxyUrl) {
          const proxyHeaders = {
            ...headers,
            "x-base-url": url.replace(/\/v1\/.*$/, ""),
            "x-provider": isAnthropic ? "anthropic" : "openai",
            "x-api-key": apiKey
          };
          const response = await fetch(proxyUrl, {
            method: "POST",
            headers: proxyHeaders,
            body: JSON.stringify(body)
          });
          if (!response.ok) {
            const text = await response.text();
            throw new Error(`API error ${response.status}: ${text.slice(0, 300)}`);
          }
          return await response.json();
        } else {
          const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
          if (!response.ok) {
            const text2 = await response.text();
            throw new Error(`API error ${response.status}: ${text2}`);
          }
          const text = await response.text();
          if (text.trimStart().startsWith("data: ")) return reassembleSSE(text);
          return JSON.parse(text);
        }
      }
      function parseSSEResponse(sseText) {
        const lines = sseText.split("\n");
        let textContent = "";
        const toolCalls = [];
        let currentToolCall = null;
        let lastChunkWasToolUse = false;
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            let jsonStr = line;
            if (line.includes("data: ")) jsonStr = line.split("data: ")[1];
            if (!jsonStr || !jsonStr.includes("{")) continue;
            const startIdx = jsonStr.indexOf("{");
            const endIdx = jsonStr.lastIndexOf("}");
            if (startIdx === -1 || endIdx === -1) continue;
            const chunk = JSON.parse(jsonStr.substring(startIdx, endIdx + 1));
            if (chunk.choices?.[0]?.delta?.content) {
              textContent += chunk.choices[0].delta.content;
              lastChunkWasToolUse = false;
            }
            if (chunk.name) {
              if (currentToolCall && currentToolCall.name !== chunk.name) toolCalls.push(currentToolCall);
              currentToolCall = { id: chunk.call_id || `call_${Date.now()}`, name: chunk.name, arguments: chunk.arguments || "" };
              lastChunkWasToolUse = true;
            } else if (lastChunkWasToolUse && chunk.arguments !== void 0 && currentToolCall) {
              currentToolCall.arguments += chunk.arguments;
            }
          } catch {
          }
        }
        if (currentToolCall) toolCalls.push(currentToolCall);
        const parsedToolCalls = toolCalls.map((t) => {
          let input = {};
          try {
            if (t.arguments.trim()) input = JSON.parse(t.arguments);
          } catch {
          }
          return { id: t.id, name: t.name, input };
        });
        return { content: textContent, tool_calls: parsedToolCalls, stop_reason: parsedToolCalls.length > 0 ? "tool_use" : "stop" };
      }
      function reassembleSSE(raw) {
        const lines = raw.split("\n");
        let content = "";
        let toolCalls = {};
        let model = "";
        let usage = null;
        let finishReason = null;
        for (const line of lines) {
          if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
          try {
            const chunk = JSON.parse(line.slice(6));
            if (chunk.model) model = chunk.model;
            if (chunk.usage) usage = chunk.usage;
            const delta = chunk.choices?.[0]?.delta;
            if (!delta) continue;
            if (delta.content) content += delta.content;
            if (delta.finish_reason) finishReason = delta.finish_reason;
            if (chunk.choices?.[0]?.finish_reason) finishReason = chunk.choices[0].finish_reason;
            if (delta.tool_calls) {
              for (const tc of delta.tool_calls) {
                if (!toolCalls[tc.index]) toolCalls[tc.index] = { id: "", name: "", arguments: "" };
                if (tc.id) toolCalls[tc.index].id = tc.id;
                if (tc.function?.name) toolCalls[tc.index].name = tc.function.name;
                if (tc.function?.arguments) toolCalls[tc.index].arguments += tc.function.arguments;
              }
            }
          } catch {
          }
        }
        const tcList = Object.values(toolCalls).filter((t) => t.name);
        return {
          choices: [{ message: { content, tool_calls: tcList.length ? tcList.map((t) => ({ id: t.id, type: "function", function: { name: t.name, arguments: t.arguments } })) : void 0 }, finish_reason: finishReason || "stop" }],
          model,
          usage: usage || { prompt_tokens: 0, completion_tokens: 0 }
        };
      }
      function buildToolDefs(tools) {
        const defs = [];
        const customTools = [];
        for (const tool of toolRegistry.list()) {
          defs.push({
            name: tool.name,
            description: tool.description,
            input_schema: tool.parameters
          });
        }
        for (const tool of tools) {
          if (typeof tool === "string") {
            if (tool === "search") {
              defs.push({ name: "search", description: "Search the web for current information", input_schema: { type: "object", properties: { query: { type: "string", description: "Search query" } }, required: ["query"] } });
            } else if (tool === "code") {
              defs.push({ name: "execute_code", description: "Execute Python code", input_schema: { type: "object", properties: { code: { type: "string", description: "Python code to execute" } }, required: ["code"] } });
            }
          } else if (typeof tool === "object" && tool.name) {
            defs.push({
              name: tool.name,
              description: tool.description || "",
              input_schema: tool.parameters || tool.input_schema || { type: "object", properties: {} }
            });
            customTools.push(tool);
          }
        }
        return { defs, customTools };
      }
      async function executeTool(name, input, config) {
        const registered = toolRegistry.get(name);
        if (registered && registered.execute) {
          return await registered.execute(input);
        }
        if (config.customTools) {
          const custom = config.customTools.find((t) => t.name === name);
          if (custom && custom.execute) {
            return await custom.execute(input);
          }
        }
        if (name === "search") return await searchWeb(input.query, config.searchApiKey);
        if (name === "execute_code") return { output: "[Code execution not available in browser]" };
        return { error: "Unknown tool" };
      }
      async function searchWeb(query, apiKey) {
        if (!apiKey) return { error: "Search API key required" };
        const response = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ api_key: apiKey, query, max_results: 5 })
        });
        const data = await response.json();
        return { results: data.results || [] };
      }
      async function schemaAsk(prompt, config, emit) {
        const { provider = "anthropic", baseUrl, apiKey, model, history, proxyUrl, schema, retries = 2, images } = config;
        const schemaStr = JSON.stringify(schema, null, 2);
        const systemPrompt = `You must respond with valid JSON that matches this schema:
${schemaStr}

Rules:
- Output ONLY the JSON object, no markdown, no explanation, no code fences
- All required fields must be present
- Types must match exactly`;
        let userContent = systemPrompt + "\n\n" + prompt;
        if (images?.length) {
          const content = [];
          for (const img of images) {
            if (provider === "anthropic") {
              content.push({ type: "image", source: { type: "base64", media_type: img.media_type || "image/jpeg", data: img.data } });
            } else {
              const url = img.url || `data:${img.media_type || "image/jpeg"};base64,${img.data}`;
              content.push({ type: "image_url", image_url: { url, detail: img.detail || "auto" } });
            }
          }
          content.push({ type: "text", text: systemPrompt + "\n\n" + prompt });
          userContent = content;
        }
        const messages = [];
        if (history?.length) messages.push(...history);
        messages.push({ role: "user", content: prompt });
        let lastError = null;
        for (let attempt = 0; attempt <= retries; attempt++) {
          if (attempt > 0) {
            console.log(`[schema] Retry ${attempt}/${retries}: ${lastError}`);
            emit("status", { message: `Retry ${attempt}/${retries}...` });
            messages.push({ role: "assistant", content: lastError.raw });
            messages.push({ role: "user", content: `That JSON was invalid: ${lastError.message}

Please fix and return ONLY valid JSON matching the schema.` });
          }
          emit("status", { message: attempt === 0 ? "Generating structured output..." : `Retry ${attempt}/${retries}...` });
          const chatFn = provider === "anthropic" ? anthropicChat : openaiChat;
          const response = await chatFn({
            messages: [{ role: "user", content: userContent }],
            tools: [],
            model,
            baseUrl,
            apiKey,
            proxyUrl,
            stream: false,
            emit
          });
          const raw = response.content.trim();
          let jsonStr = raw;
          const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
          if (fenceMatch) jsonStr = fenceMatch[1].trim();
          let parsed;
          try {
            parsed = JSON.parse(jsonStr);
          } catch (e) {
            lastError = { message: `JSON parse error: ${e.message}`, raw };
            continue;
          }
          const validation = validateSchema(parsed, schema);
          if (!validation.valid) {
            lastError = { message: validation.error, raw };
            continue;
          }
          return { answer: raw, data: parsed, attempts: attempt + 1 };
        }
        throw new Error(`Schema validation failed after ${retries + 1} attempts: ${lastError.message}`);
      }
      function validateSchema(data, schema) {
        if (!schema || !schema.type) return { valid: true };
        if (schema.type === "object") {
          if (typeof data !== "object" || data === null || Array.isArray(data)) {
            return { valid: false, error: `Expected object, got ${Array.isArray(data) ? "array" : typeof data}` };
          }
          if (schema.required) {
            for (const field of schema.required) {
              if (!(field in data)) {
                return { valid: false, error: `Missing required field: "${field}"` };
              }
            }
          }
          if (schema.properties) {
            for (const [key, prop] of Object.entries(schema.properties)) {
              if (key in data && data[key] !== null && data[key] !== void 0) {
                const val = data[key];
                if (prop.type === "string" && typeof val !== "string") return { valid: false, error: `Field "${key}" should be string, got ${typeof val}` };
                if (prop.type === "number" && typeof val !== "number") return { valid: false, error: `Field "${key}" should be number, got ${typeof val}` };
                if (prop.type === "boolean" && typeof val !== "boolean") return { valid: false, error: `Field "${key}" should be boolean, got ${typeof val}` };
                if (prop.type === "array" && !Array.isArray(val)) return { valid: false, error: `Field "${key}" should be array, got ${typeof val}` };
                if (prop.enum && !prop.enum.includes(val)) return { valid: false, error: `Field "${key}" must be one of: ${prop.enum.join(", ")}` };
              }
            }
          }
        } else if (schema.type === "array") {
          if (!Array.isArray(data)) return { valid: false, error: `Expected array, got ${typeof data}` };
        } else if (schema.type === "string") {
          if (typeof data !== "string") return { valid: false, error: `Expected string, got ${typeof data}` };
        } else if (schema.type === "number") {
          if (typeof data !== "number") return { valid: false, error: `Expected number, got ${typeof data}` };
        }
        return { valid: true };
      }
      const toolRegistry = {
        _tools: /* @__PURE__ */ new Map(),
        register(name, tool) {
          if (!name || typeof name !== "string") throw new Error("Tool name required");
          if (!tool || typeof tool !== "object") throw new Error("Tool must be an object");
          if (!tool.description) throw new Error("Tool description required");
          if (!tool.execute || typeof tool.execute !== "function") throw new Error("Tool execute function required");
          this._tools.set(name, {
            name,
            description: tool.description,
            parameters: tool.parameters || { type: "object", properties: {} },
            execute: tool.execute
          });
        },
        unregister(name) {
          this._tools.delete(name);
        },
        get(name) {
          return this._tools.get(name);
        },
        list(category) {
          const tools = Array.from(this._tools.values());
          if (!category) return tools;
          return tools.filter((t) => t.category === category);
        },
        clear() {
          this._tools.clear();
        }
      };
      return { agenticAsk: agenticAsk2, toolRegistry };
    });
  }
});

// src/tools/code.ts
var isBrowser = typeof window !== "undefined" && typeof document !== "undefined";
function withTimeout(promise, timeoutMs) {
  if (!timeoutMs || timeoutMs <= 0) return promise;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Code execution timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    promise.then(
      (result) => {
        clearTimeout(timer);
        resolve(result);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}
var pyodideInstance = null;
function createFsWrapper(filesystem) {
  return {
    read: (path) => filesystem.read(path),
    write: (path, data) => filesystem.write(path, data)
  };
}
async function injectFilesystem(vm, filesystem) {
  if (!filesystem) return;
  const fsHandle = vm.newObject();
  const readFn = vm.newAsyncifiedFunction("readFileSync", async (pathHandle) => {
    const path = String(vm.dump(pathHandle));
    const result = await filesystem.read(path);
    if (result.error || !result.content) throw vm.newError(`ENOENT: no such file or directory, open '${path}'`);
    return vm.newString(result.content);
  });
  vm.setProp(fsHandle, "readFileSync", readFn);
  readFn.dispose();
  const writeFn = vm.newAsyncifiedFunction("writeFileSync", async (pathHandle, dataHandle) => {
    const path = String(vm.dump(pathHandle));
    const data = String(vm.dump(dataHandle));
    const result = await filesystem.write(path, data);
    if (result.error) throw vm.newError(`EACCES: permission denied, write '${path}'`);
    return vm.undefined;
  });
  vm.setProp(fsHandle, "writeFileSync", writeFn);
  writeFn.dispose();
  vm.setProp(vm.global, "fs", fsHandle);
  fsHandle.dispose();
}
function detectLanguage(code) {
  const pythonPatterns = /\b(import|from|def|print|if __name__|class\s+\w+:|with\s+open)\b/;
  return pythonPatterns.test(code) ? "python" : "javascript";
}
async function executeJavaScriptBrowser(code, filesystem) {
  try {
    const AsyncFunction = Object.getPrototypeOf(async function() {
    }).constructor;
    const logs = [];
    const _console = {
      log: (...a) => logs.push(a.join(" ")),
      warn: (...a) => logs.push(a.join(" ")),
      error: (...a) => logs.push(a.join(" "))
    };
    const fsWrapper = filesystem ? createFsWrapper(filesystem) : void 0;
    const fn = new AsyncFunction("console", "fs", `return (async () => { ${code} })()`);
    const result = await fn(_console, fsWrapper);
    const output = [...logs, ...result !== void 0 && result !== null ? [`\u2192 ${String(result)}`] : []].join("\n");
    return { code, output };
  } catch (err) {
    return { code, output: "", error: err.message || String(err) };
  }
}
async function executePythonBrowser(code, filesystem) {
  if (!pyodideInstance) {
    try {
      if (typeof window !== "undefined" && !window.loadPyodide) {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js";
        document.head.appendChild(script);
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
        });
      }
      const loadPyodide = window.loadPyodide || (await import("pyodide")).loadPyodide;
      pyodideInstance = await loadPyodide();
      await pyodideInstance.loadPackage("micropip");
      const micropip = pyodideInstance.pyimport("micropip");
      await micropip.install(["numpy", "matplotlib"]);
    } catch (err) {
      return { code, output: "", error: `Pyodide unavailable: ${err.message || String(err)}` };
    }
  }
  try {
    if (filesystem) {
      pyodideInstance.globals.set("__filesystem__", {
        read: (path) => filesystem.read(path),
        write: (path, data) => filesystem.write(path, data)
      });
      await pyodideInstance.runPythonAsync(`
import io, js
_original_open = open
def open(file, mode='r', *args, **kwargs):
    if isinstance(file, str) and (file.startswith('/') or file.startswith('./')):
        fs = js.__filesystem__
        if 'r' in mode:
            result = fs.read(file)
            if result.error: raise FileNotFoundError(f"No such file: {file}")
            return io.StringIO(result.content)
        elif 'w' in mode:
            class W:
                def __init__(self, p): self.p=p; self.b=[]
                def write(self, d): self.b.append(str(d)); return len(d)
                def close(self): fs.write(self.p,''.join(self.b))
                def __enter__(self): return self
                def __exit__(self, *a): self.close()
            return W(file)
    return _original_open(file, mode, *args, **kwargs)
`);
    }
    const output = [];
    pyodideInstance.setStdout({ batched: (text) => output.push(text) });
    const result = await pyodideInstance.runPythonAsync(code);
    const resultStr = result !== void 0 && result !== null ? String(result) : "";
    return { code, output: [...output, ...resultStr ? [`\u2192 ${resultStr}`] : []].join("\n") };
  } catch (err) {
    return { code, output: "", error: err.message || String(err) };
  }
}
async function buildFileMap(code, filesystem) {
  const paths = [...code.matchAll(/open\(\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
  const map = {};
  for (const p of paths) {
    const r = await filesystem.read(p);
    if (r.content) map[p] = r.content;
    if (p.startsWith("./")) {
      const abs = p.slice(1);
      const r2 = await filesystem.read(abs);
      if (r2.content) map[p] = r2.content;
    }
  }
  return map;
}
async function executePythonNode(code, filesystem, timeout) {
  const { spawn } = await import("child_process");
  let fullCode = code;
  if (filesystem) {
    const preamble = `
import sys as _sys, io, json as _json
_fs_data = _json.loads(_sys.stdin.readline())
class _FS:
    def __init__(self): self._w={}
    def read(self,p):
        d=_fs_data.get(p) or _fs_data.get('./'+p.lstrip('/'))
        return d
    def write(self,p,d): self._w[p]=d
    def flush(self):
        if self._w: print(f"__FS_WRITES__:{_json.dumps(self._w)}",flush=True)
_fs=_FS()
_open=open
def open(file,mode='r',*a,**k):
    if isinstance(file,str) and (file.startswith('/') or file.startswith('./')):
        if 'r' in mode:
            content=_fs.read(file)
            if content is None: raise FileNotFoundError(f"No such file: {file}")
            return io.StringIO(content)
        if 'w' in mode:
            class W:
                def __init__(self,p): self.p=p;self.b=[]
                def write(self,d): self.b.append(str(d));return len(d)
                def close(self): _fs.write(self.p,''.join(self.b))
                def __enter__(self): return self
                def __exit__(self,*a): self.close()
            return W(file)
    return _open(file,mode,*a,**k)
`;
    const epilogue = `
_fs.flush()
`;
    fullCode = preamble + "\n" + code + "\n" + epilogue;
  }
  return new Promise(async (resolve) => {
    const proc = spawn("python3", ["-c", fullCode]);
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = timeout && timeout > 0 ? setTimeout(() => {
      timedOut = true;
      proc.kill("SIGTERM");
    }, timeout) : null;
    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    proc.on("close", async (exitCode) => {
      if (timer) clearTimeout(timer);
      if (timedOut) {
        resolve({ code, output: "", error: `Code execution timed out after ${timeout}ms` });
        return;
      }
      const writeMatch = stdout.match(/__FS_WRITES__:(.+)$/m);
      if (writeMatch && filesystem) {
        try {
          const writes = JSON.parse(writeMatch[1]);
          for (const [path, data] of Object.entries(writes)) {
            await filesystem.write(path, data);
          }
          stdout = stdout.replace(/__FS_WRITES__:.+$/m, "").trim();
        } catch {
        }
      }
      if (exitCode !== 0) {
        resolve({ code, output: stdout, error: stderr || `Exit code ${exitCode}` });
      } else {
        resolve({ code, output: stdout });
      }
    });
    proc.on("error", (err) => {
      resolve({ code, output: "", error: `Python not found: ${err.message}` });
    });
    if (filesystem) {
      const fileMap = await buildFileMap(code, filesystem);
      proc.stdin.write(JSON.stringify(fileMap) + "\n");
      proc.stdin.end();
    }
  });
}
async function executeCode(input, filesystem, timeout) {
  const code = String(input.code ?? "");
  if (!code) return { code: "", output: "", error: "No code provided" };
  const language = detectLanguage(code);
  if (language === "python") {
    return isBrowser ? withTimeout(executePythonBrowser(code, filesystem), timeout) : executePythonNode(code, filesystem, timeout);
  }
  if (isBrowser) {
    return executeJavaScriptBrowser(code, filesystem, logs);
  }
  const hasAwait = /\bawait\b/.test(code);
  const logs = [];
  function injectConsole(vm2) {
    const consoleHandle = vm2.newObject();
    for (const method of ["log", "warn", "error"]) {
      const fn = vm2.newFunction(method, (...args) => {
        logs.push(args.map((h) => String(vm2.dump(h))).join(" "));
      });
      vm2.setProp(consoleHandle, method, fn);
      fn.dispose();
    }
    vm2.setProp(vm2.global, "console", consoleHandle);
    consoleHandle.dispose();
  }
  function handleResult(result, vm2) {
    if (result.error) {
      const err = vm2.dump(result.error);
      result.error.dispose();
      vm2.dispose();
      const errMsg = err && typeof err === "object" ? err.message ?? err.name ?? JSON.stringify(err) : String(err);
      return { code, output: logs.join("\n"), error: String(errMsg) };
    }
    const val = vm2.dump(result.value);
    result.value.dispose();
    vm2.dispose();
    const output = [
      ...logs,
      ...val !== void 0 && val !== null ? [`\u2192 ${String(val)}`] : []
    ].join("\n");
    return { code, output };
  }
  if (hasAwait || filesystem) {
    const { newAsyncContext } = await import("quickjs-emscripten");
    const vm2 = await newAsyncContext();
    injectConsole(vm2);
    await injectFilesystem(vm2, filesystem);
    const wrapped = `(async()=>{return(${code})})().then(v=>{globalThis.__asyncResult=v},e=>{globalThis.__asyncError=String(e)})`;
    return withTimeout((async () => {
      const result = await vm2.evalCodeAsync(wrapped);
      if (result.error) return handleResult(result, vm2);
      result.value.dispose();
      vm2.runtime.executePendingJobs();
      const errHandle = vm2.getProp(vm2.global, "__asyncError");
      const errVal = vm2.dump(errHandle);
      errHandle.dispose();
      if (errVal !== void 0) {
        vm2.dispose();
        return { code, output: logs.join("\n"), error: String(errVal) };
      }
      const valHandle = vm2.getProp(vm2.global, "__asyncResult");
      const val = vm2.dump(valHandle);
      valHandle.dispose();
      vm2.dispose();
      const output = [
        ...logs,
        ...val !== void 0 && val !== null ? [`\u2192 ${String(val)}`] : []
      ].join("\n");
      return { code, output };
    })(), timeout);
  }
  const { getQuickJS } = await import("quickjs-emscripten");
  const QuickJS = await getQuickJS();
  const vm = QuickJS.newContext();
  injectConsole(vm);
  return withTimeout(new Promise((resolve, reject) => {
    try {
      const result = vm.evalCode(code);
      resolve(handleResult(result, vm));
    } catch (e) {
      reject(e);
    }
  }), timeout);
}

// src/tools/file.ts
var fileReadToolDef = {
  name: "file_read",
  description: "Read the contents of a file.",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "File path to read" }
    },
    required: ["path"]
  }
};
var fileWriteToolDef = {
  name: "file_write",
  description: "Write content to a file.",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "File path to write" },
      content: { type: "string", description: "Content to write" }
    },
    required: ["path", "content"]
  }
};
async function executeFileRead(input, fs) {
  const path = String(input.path ?? "");
  if (!fs) return { path, action: "read", content: "Error: no filesystem configured" };
  const result = await fs.read(path);
  return { path, action: "read", content: result.error ? `Error: ${result.error}` : result.content ?? "" };
}
async function executeFileWrite(input, fs) {
  const path = String(input.path ?? "");
  const content = String(input.content ?? "");
  if (!fs) return { path, action: "write", content: "Error: no filesystem configured" };
  const result = await fs.write(path, content);
  return { path, action: "write", content: result.error ? `Error: ${result.error}` : void 0 };
}

// src/tools/shell.ts
var shellToolDef = {
  name: "shell_exec",
  description: "Execute shell commands (ls, cat, grep, find, pwd, etc.) against the virtual filesystem. Returns command output.",
  parameters: {
    type: "object",
    properties: {
      command: { type: "string", description: 'Shell command to execute (e.g., "ls /", "cat /file.txt")' }
    },
    required: ["command"]
  }
};
function isNodeEnv() {
  return typeof process !== "undefined" && process.versions?.node != null;
}
async function executeShell(input, filesystem) {
  const command = String(input.command ?? "");
  if (!command) return { command: "", output: "", error: "No command provided", exitCode: 1 };
  if (!isNodeEnv()) return { command, output: "", error: "shell_exec not available in browser", exitCode: 1 };
  if (!filesystem) return { command, output: "", error: "No filesystem configured", exitCode: 1 };
  try {
    const { AgenticShell } = await import("agentic-shell");
    const shell = new AgenticShell(filesystem);
    const result = await shell.exec(command);
    const output = typeof result === "object" && result !== null ? result.output ?? String(result) : String(result);
    const exitCode = typeof result === "object" && result !== null ? result.exitCode ?? 0 : 0;
    return { command, output, exitCode };
  } catch (err) {
    return { command, output: "", error: err.message || String(err), exitCode: 1 };
  }
}

// ../agentic-filesystem/dist/index.js
var AgenticFileSystem = class {
  storage;
  embed;
  readOnly;
  permissions;
  constructor(config) {
    this.storage = config.storage;
    this.embed = config.embed;
    this.readOnly = config.readOnly ?? false;
    this.permissions = new Map(Object.entries(config.permissions ?? {}));
  }
  setPermission(path, perm) {
    const normalized = path.startsWith("/") ? path : "/" + path;
    this.permissions.set(normalized, perm);
  }
  checkPermission(path, op) {
    const normalized = path.startsWith("/") ? path : "/" + path;
    if (this.permissions.has(normalized)) {
      if (!this.permissions.get(normalized)[op]) throw new PermissionDeniedError(path);
      return;
    }
    let best;
    let bestLen = -1;
    for (const [key, perm] of this.permissions) {
      const prefix = key.endsWith("/") ? key : key + "/";
      if ((normalized === key || normalized.startsWith(prefix)) && key.length > bestLen) {
        best = perm;
        bestLen = key.length;
      }
    }
    if (best && !best[op]) throw new PermissionDeniedError(path);
  }
  // ── Core file operations ──
  /**
   * Read file contents at path.
   * @param path Absolute path starting with /
   * @returns FileResult with content, or error message if not found or permission denied
   */
  async read(path) {
    try {
      this.checkPermission(path, "read");
      const content = await this.storage.get(path);
      if (content === null) throw new NotFoundError(path);
      return { path, content };
    } catch (err) {
      if (err instanceof NotFoundError || err instanceof PermissionDeniedError) {
        return { path, error: err.message };
      }
      return { path, error: new IOError(String(err)).message };
    }
  }
  /**
   * Write content to path. Returns error if readOnly or permission denied.
   * @param path Absolute path starting with /
   * @param content String content to write
   */
  async write(path, content) {
    if (this.readOnly) return { path, error: new PermissionDeniedError("Read-only file system").message };
    try {
      this.checkPermission(path, "write");
      await this.storage.set(path, content);
      return { path };
    } catch (err) {
      if (err instanceof PermissionDeniedError) return { path, error: err.message };
      return { path, error: new IOError(String(err)).message };
    }
  }
  /**
   * Delete file at path. Returns error if readOnly or permission denied.
   * @param path Absolute path starting with /
   */
  async delete(path) {
    if (this.readOnly) return { path, error: new PermissionDeniedError("Read-only file system").message };
    try {
      this.checkPermission(path, "write");
      await this.storage.delete(path);
      return { path };
    } catch (err) {
      if (err instanceof PermissionDeniedError) return { path, error: err.message };
      return { path, error: new IOError(String(err)).message };
    }
  }
  /** List files under prefix. Returns LsResult[] with name, type, size, mtime. */
  async ls(prefix) {
    try {
      const paths = await this.storage.list(prefix);
      const seen = /* @__PURE__ */ new Set();
      const results = [];
      for (const p of paths) {
        const rel = prefix ? p.slice(prefix.endsWith("/") ? prefix.length : prefix.length + 1) : p.replace(/^\//, "");
        const parts = rel.split("/");
        if (parts.length > 1) {
          const dirName = (prefix ? prefix.replace(/\/?$/, "/") : "/") + parts[0];
          if (!seen.has(dirName)) {
            seen.add(dirName);
            results.push({ name: dirName, type: "dir" });
          }
        } else {
          let meta = null;
          try {
            meta = await this.storage.stat?.(p) ?? null;
          } catch {
          }
          results.push({ name: p, type: "file", size: meta?.size, mtime: meta?.mtime });
        }
      }
      return results;
    } catch (err) {
      new IOError(String(err));
      return [];
    }
  }
  /** Return recursive directory tree under prefix (default: '/'). */
  async tree(prefix) {
    try {
      const root = prefix ?? "/";
      const paths = await this.storage.list(root);
      const nodes = /* @__PURE__ */ new Map();
      const getOrCreateDir = (dirPath) => {
        if (!nodes.has(dirPath)) {
          nodes.set(dirPath, {
            name: dirPath.split("/").filter(Boolean).pop() ?? dirPath,
            path: dirPath,
            type: "dir",
            children: []
          });
        }
        return nodes.get(dirPath);
      };
      for (const p of paths) {
        let meta = null;
        try {
          meta = await this.storage.stat?.(p) ?? null;
        } catch {
        }
        const fileNode = {
          name: p.split("/").filter(Boolean).pop() ?? p,
          path: p,
          type: "file",
          size: meta?.size,
          mtime: meta?.mtime
        };
        const parts = p.split("/").filter(Boolean);
        const rootParts = root.split("/").filter(Boolean);
        const relativeParts = parts.slice(rootParts.length);
        if (relativeParts.length <= 1) {
          nodes.set(p, fileNode);
        } else {
          let currentPath = "/" + rootParts.join("/");
          for (let i = 0; i < relativeParts.length - 1; i++) {
            const parentPath2 = currentPath;
            currentPath = currentPath === "/" ? "/" + relativeParts[i] : currentPath + "/" + relativeParts[i];
            const dir = getOrCreateDir(currentPath);
            const parent2 = parentPath2 === root ? null : getOrCreateDir(parentPath2);
            if (parent2 && !parent2.children.find((c) => c.path === currentPath)) {
              parent2.children.push(dir);
            }
          }
          const parentPath = currentPath;
          const parent = parentPath === root ? null : getOrCreateDir(parentPath);
          if (parent) {
            if (!parent.children.find((c) => c.path === p)) parent.children.push(fileNode);
          } else {
            nodes.set(p, fileNode);
          }
        }
      }
      const rootNorm = root.endsWith("/") ? root.slice(0, -1) : root;
      return Array.from(nodes.values()).filter((n) => {
        const parent = n.path.substring(0, n.path.lastIndexOf("/")) || "/";
        return parent === rootNorm || parent === rootNorm + "/";
      });
    } catch {
      return [];
    }
  }
  // ── Batch & streaming operations ──
  /**
   * Batch-get multiple files by path.
   * @param paths Array of absolute file paths
   * @returns Record mapping each path to its content, or null if not found
   */
  async batchGet(paths) {
    return this.storage.batchGet(paths);
  }
  /**
   * Batch-set multiple files at once. Throws if readOnly.
   * @param entries Record mapping absolute file paths to content strings
   */
  async batchSet(entries) {
    if (this.readOnly) throw new PermissionDeniedError("Read-only file system");
    return this.storage.batchSet(entries);
  }
  /**
   * Stream grep results as an async iterable.
   * @param pattern Search pattern (matched against file content)
   * @returns AsyncIterable yielding { path, line, content } match objects
   */
  scanStream(pattern) {
    return this.storage.scanStream(pattern);
  }
  // ── Smart grep with multiple strategies ──
  /** Search files for pattern. Use semantic:true for embedding-based search. */
  async grep(pattern, options) {
    if (options?.semantic && this.embed) {
      return await this.semanticGrep(pattern);
    }
    return await this.literalGrep(pattern);
  }
  async literalGrep(pattern) {
    try {
      const results = await this.storage.scan(pattern);
      return results.map(({ path, line, content }) => ({
        path,
        line,
        content,
        match: pattern
      }));
    } catch (err) {
      new IOError(String(err));
      return [];
    }
  }
  async semanticGrep(query) {
    if (!this.embed) return [];
    try {
      const embedding = await this.embed.encode(query);
      const results = await this.embed.search(embedding, 10);
      const matches = [];
      for (const { path, score } of results) {
        const content = await this.storage.get(path);
        if (content) {
          const firstLine = content.split("\n")[0];
          matches.push({
            path,
            line: 1,
            content: firstLine,
            match: `(semantic match, score: ${score.toFixed(2)})`
          });
        }
      }
      return matches;
    } catch (err) {
      new IOError(String(err));
      return [];
    }
  }
  // ── Tool definitions for AI agents ──
  /** Return tool definitions for AI agent tool-use integration. */
  getToolDefinitions() {
    return [
      {
        name: "file_read",
        description: "Read the contents of a file",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "File path to read" }
          },
          required: ["path"]
        }
      },
      {
        name: "file_write",
        description: "Write content to a file",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "File path to write" },
            content: { type: "string", description: "Content to write" }
          },
          required: ["path", "content"]
        }
      },
      {
        name: "grep",
        description: "Search for pattern in files (supports literal and semantic search)",
        parameters: {
          type: "object",
          properties: {
            pattern: { type: "string", description: "Search pattern or query" },
            semantic: { type: "boolean", description: "Use semantic search instead of literal match" }
          },
          required: ["pattern"]
        }
      },
      {
        name: "ls",
        description: "List files in directory",
        parameters: {
          type: "object",
          properties: {
            prefix: { type: "string", description: "Directory prefix to list" }
          }
        }
      },
      {
        name: "file_delete",
        description: "Delete a file at the specified path",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "File path to delete" }
          },
          required: ["path"]
        }
      },
      {
        name: "file_tree",
        description: "Get recursive directory tree structure with file metadata",
        parameters: {
          type: "object",
          properties: {
            prefix: { type: "string", description: "Root path to display tree from (default: /)" }
          }
        }
      },
      {
        name: "batch_get",
        description: "Read multiple files at once by path",
        parameters: {
          type: "object",
          properties: {
            paths: {
              type: "array",
              items: { type: "string" },
              description: "Array of absolute file paths to read"
            }
          },
          required: ["paths"]
        }
      },
      {
        name: "batch_set",
        description: "Write multiple files at once",
        parameters: {
          type: "object",
          properties: {
            entries: {
              type: "object",
              additionalProperties: { type: "string" },
              description: "Map of absolute file paths to content strings"
            }
          },
          required: ["entries"]
        }
      },
      {
        name: "grep_stream",
        description: "Stream grep results for large result sets",
        parameters: {
          type: "object",
          properties: {
            pattern: {
              type: "string",
              description: "Search pattern to match against file content"
            }
          },
          required: ["pattern"]
        }
      }
    ];
  }
  /** Execute a named tool with input params. Used by AI agent runtimes. */
  async executeTool(name, input) {
    switch (name) {
      case "file_read":
        return await this.read(String(input.path ?? ""));
      case "file_write":
        return await this.write(String(input.path ?? ""), String(input.content ?? ""));
      case "grep":
        return await this.grep(String(input.pattern ?? ""), { semantic: Boolean(input.semantic) });
      case "ls":
        return await this.ls(input.prefix ? String(input.prefix) : void 0);
      case "file_delete":
        return await this.delete(String(input.path ?? ""));
      case "file_tree":
        return await this.tree(input.prefix ? String(input.prefix) : void 0);
      case "batch_get":
        return await this.batchGet(input.paths);
      case "batch_set":
        return await this.batchSet(input.entries);
      case "grep_stream": {
        const results = [];
        for await (const r of this.scanStream(input.pattern)) {
          results.push(r);
        }
        return results;
      }
      default:
        return { error: "Unknown tool" };
    }
  }
};

// src/ask.ts
var import_agentic_core = __toESM(require_agentic_core(), 1);
var agenticAsk = import_agentic_core.default.agenticAsk ?? import_agentic_core.default;
var OS_SYSTEM_PROMPT = `You are an AI assistant running on a computer. You have access to a filesystem and can execute code. Use the available tools to complete tasks.`;
function buildTools(config) {
  const tools = [];
  const fs = config.filesystem;
  const enabled = config.tools ?? ["file", "code"];
  if (enabled.includes("file")) {
    tools.push({ ...fileReadToolDef, execute: (input) => executeFileRead(input, fs).then((r) => r.content ?? r.error ?? "done") });
    tools.push({ ...fileWriteToolDef, execute: (input) => executeFileWrite(input, fs).then((r) => r.content ?? r.error ?? "File written") });
  }
  if (enabled.includes("code")) {
    tools.push({
      name: "code_exec",
      description: "Execute JavaScript or Python code in a sandbox",
      parameters: { type: "object", properties: { code: { type: "string" }, language: { type: "string", enum: ["javascript", "python"] } }, required: ["code"] },
      execute: (input) => executeCode(input, fs).then((r) => r.error ? `Error: ${r.error}` : r.output)
    });
  }
  if (enabled.includes("shell") && isNodeEnv()) {
    tools.push({ ...shellToolDef, execute: (input) => executeShell(input, fs).then((r) => r.error ? `Error: ${r.error}` : r.output) });
  }
  return tools;
}
async function ask(prompt, config = {}) {
  const filesystem = config.filesystem ?? new AgenticFileSystem({ storage: new MemoryStorage() });
  const tools = buildTools({ ...config, filesystem });
  const toolCalls = [];
  const wrappedTools = tools.map((t) => ({
    ...t,
    execute: async (input) => {
      const out = await t.execute(input);
      toolCalls.push({ tool: t.name, input, output: out });
      return out;
    }
  }));
  const result = await agenticAsk(prompt, {
    provider: config.provider ?? "anthropic",
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    model: config.model,
    system: config.systemPrompt ?? OS_SYSTEM_PROMPT,
    tools: wrappedTools,
    stream: false
  });
  return { answer: result.answer, toolCalls: toolCalls.length > 0 ? toolCalls : void 0, usage: result.usage };
}
async function* askStream(prompt, config = {}) {
  const filesystem = config.filesystem ?? new AgenticFileSystem({ storage: new MemoryStorage() });
  const tools = buildTools({ ...config, filesystem });
  const chunks = [];
  let resolve = null;
  let done = false;
  const push = (chunk) => {
    chunks.push(chunk);
    resolve?.();
    resolve = null;
  };
  const promise = agenticAsk(prompt, {
    provider: config.provider ?? "anthropic",
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    model: config.model,
    system: config.systemPrompt ?? OS_SYSTEM_PROMPT,
    tools,
    stream: true
  }, (type, data) => {
    if (type === "token") push({ type: "text", text: data?.text ?? "" });
  }).then(() => {
    done = true;
    resolve?.();
    resolve = null;
  });
  let i = 0;
  while (!done || i < chunks.length) {
    if (i < chunks.length) yield chunks[i++];
    else await new Promise((r) => {
      resolve = r;
    });
  }
  await promise;
}
export {
  AgenticFileSystem,
  AgenticStoreBackend,
  MemoryStorage,
  ask,
  askStream
};
