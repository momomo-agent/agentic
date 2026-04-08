import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ask, askStream } from '../src/ask.js'
import { isNodeEnv, executeShell } from '../src/tools/shell.js'
import { AgenticFileSystem, MemoryStorage } from 'agentic-filesystem'
import type { AgenticConfig } from '../src/types.js'
import type { AgentStreamChunk, StreamChunk } from 'agentic-core'

// --- Helpers ---

function finalResponse(text: string) {
  return { text, stopReason: 'end' as const, toolCalls: [], rawContent: [], usage: { input: 1, output: 1 } }
}

function mockStreamProvider(rounds: StreamChunk[][]): any {
  let callCount = 0
  return {
    chat: vi.fn().mockResolvedValue(finalResponse('chat fallback')),
    stream: vi.fn().mockImplementation(async function* () {
      const chunks = rounds[callCount] ?? []
      callCount++
      for (const c of chunks) yield c
    }),
  }
}

async function collectChunks(gen: AsyncGenerator<AgentStreamChunk>): Promise<AgentStreamChunk[]> {
  const chunks: AgentStreamChunk[] = []
  for await (const chunk of gen) chunks.push(chunk)
  return chunks
}

// --- Browser Verification ---

describe('Browser Verification', () => {
  const origProcess = globalThis.process

  beforeEach(() => {
    // @ts-expect-error - simulate browser by removing process
    delete (globalThis as any).process
  })

  afterEach(() => {
    globalThis.process = origProcess
  })

  it('isNodeEnv() returns false when process is undefined', () => {
    expect(isNodeEnv()).toBe(false)
  })

  it('shell tool excluded in browser — executeShell returns browser error', async () => {
    const fs = new AgenticFileSystem({ storage: new MemoryStorage() })
    const result = await executeShell({ command: 'echo hi' }, fs)
    expect(result.exitCode).toBe(1)
    expect(result.error).toMatch(/browser/i)
  })

  it('default filesystem is MemoryStorage — ask() does not throw', async () => {
    const chat = vi.fn().mockResolvedValueOnce(finalResponse('browser-ok'))
    const config: AgenticConfig = {
      provider: 'custom',
      customProvider: { chat },
      apiKey: 'test',
      tools: [],
    }
    const result = await ask('hello', config)
    expect(result.answer).toBe('browser-ok')
  })

  it('code_exec tool is registered and offered to provider in browser mode', async () => {
    // Verify code_exec tool is included in toolDefs sent to provider when tools:['code'].
    // QuickJS WASM loading requires bundler support so we can't test actual execution
    // in Node simulation, but we can verify the tool registration and call flow.
    const chat = vi.fn().mockResolvedValueOnce(finalResponse('code-registered'))
    const config: AgenticConfig = {
      provider: 'custom',
      customProvider: { chat },
      apiKey: 'test',
      tools: ['code'],
    }
    await ask('hello', config)
    // Verify the provider received tool definitions including code_exec
    const toolDefs = chat.mock.calls[0][1]
    const codeTool = toolDefs.find((t: any) => t.name === 'code_exec')
    expect(codeTool).toBeDefined()
    expect(codeTool.parameters.properties.code).toBeDefined()
  })

  it('ask() works in browser with mock provider', async () => {
    const chat = vi.fn().mockResolvedValueOnce(finalResponse('browser-ask-ok'))
    const config: AgenticConfig = {
      provider: 'custom',
      customProvider: { chat },
      apiKey: 'test',
      tools: [],
    }
    const result = await ask('test browser', config)
    expect(result.answer).toBe('browser-ask-ok')
    expect(chat).toHaveBeenCalledTimes(1)
  })

  it('askStream() works in browser with mock provider', async () => {
    const provider = mockStreamProvider([
      [
        { type: 'text_delta', text: 'streaming' },
        { type: 'text_delta', text: ' from browser' },
        { type: 'message_stop', usage: { input: 5, output: 3 } },
      ],
    ])

    const config: AgenticConfig = {
      provider: 'custom',
      customProvider: provider,
      apiKey: 'test',
      tools: [],
    }

    const chunks = await collectChunks(askStream('test browser stream', config))
    const done = chunks.find(c => c.type === 'done')
    expect(done).toBeDefined()
    expect(done!.result!.answer).toBe('streaming from browser')
  })
})
