// agentic-lite — thin integration layer over agentic-core
// agentic-core handles LLM calls, agent loop, streaming
// agentic-lite provides file/code/shell tools + OS system prompt

import { executeCode } from './tools/code.js'
import { executeFileRead, executeFileWrite, fileReadToolDef, fileWriteToolDef } from './tools/file.js'
import { executeShell, isNodeEnv, shellToolDef } from './tools/shell.js'
import { AgenticFileSystem, MemoryStorage } from 'agentic-filesystem'
import type { AgenticConfig, AgenticResult, ToolCall } from './types.js'

import agenticCoreModule from 'agentic-core'
const agenticAsk: (prompt: string, config: Record<string, unknown>, emit?: (type: string, data: any) => void) => Promise<{ answer: string; usage?: any }> = agenticCoreModule.agenticAsk ?? agenticCoreModule

const OS_SYSTEM_PROMPT = `You are an AI assistant running on a computer. You have access to a filesystem and can execute code. Use the available tools to complete tasks.`

function buildTools(config: AgenticConfig) {
  const tools: any[] = []
  const fs = config.filesystem
  const enabled = config.tools ?? ['file', 'code']

  if (enabled.includes('file')) {
    tools.push({ ...fileReadToolDef, execute: (input: any) => executeFileRead(input, fs).then(r => r.content ?? r.error ?? 'done') })
    tools.push({ ...fileWriteToolDef, execute: (input: any) => executeFileWrite(input, fs).then(r => r.content ?? r.error ?? 'File written') })
  }
  if (enabled.includes('code')) {
    tools.push({
      name: 'code_exec',
      description: 'Execute JavaScript or Python code in a sandbox',
      parameters: { type: 'object', properties: { code: { type: 'string' }, language: { type: 'string', enum: ['javascript', 'python'] } }, required: ['code'] },
      execute: (input: any) => executeCode(input, fs).then(r => r.error ? `Error: ${r.error}` : r.output),
    })
  }
  if (enabled.includes('shell') && isNodeEnv()) {
    tools.push({ ...shellToolDef, execute: (input: any) => executeShell(input, fs).then(r => r.error ? `Error: ${r.error}` : r.output) })
  }
  return tools
}

export async function ask(prompt: string, config: AgenticConfig = {}): Promise<AgenticResult> {
  const filesystem = config.filesystem ?? new AgenticFileSystem({ storage: new MemoryStorage() })
  const tools = buildTools({ ...config, filesystem })
  const toolCalls: ToolCall[] = []
  const wrappedTools = tools.map(t => ({
    ...t,
    execute: async (input: any) => { const out = await t.execute(input); toolCalls.push({ tool: t.name, input, output: out }); return out },
  }))

  const result = await agenticAsk(prompt, {
    provider: config.provider ?? 'anthropic', apiKey: config.apiKey, baseUrl: config.baseUrl,
    model: config.model, system: config.systemPrompt ?? OS_SYSTEM_PROMPT, tools: wrappedTools, stream: false,
  })

  return { answer: result.answer, toolCalls: toolCalls.length > 0 ? toolCalls : undefined, usage: result.usage }
}

export async function* askStream(prompt: string, config: AgenticConfig = {}): AsyncGenerator<{ type: string; text?: string }> {
  const filesystem = config.filesystem ?? new AgenticFileSystem({ storage: new MemoryStorage() })
  const tools = buildTools({ ...config, filesystem })

  const chunks: { type: string; text?: string }[] = []
  let resolve: (() => void) | null = null
  let done = false
  const push = (chunk: any) => { chunks.push(chunk); resolve?.(); resolve = null }

  const promise = agenticAsk(prompt, {
    provider: config.provider ?? 'anthropic', apiKey: config.apiKey, baseUrl: config.baseUrl,
    model: config.model, system: config.systemPrompt ?? OS_SYSTEM_PROMPT, tools, stream: true,
  }, (type: string, data: any) => {
    if (type === 'token') push({ type: 'text', text: data?.text ?? '' })
  }).then(() => { done = true; resolve?.(); resolve = null })

  let i = 0
  while (!done || i < chunks.length) {
    if (i < chunks.length) yield chunks[i++]
    else await new Promise<void>(r => { resolve = r })
  }
  await promise
}
