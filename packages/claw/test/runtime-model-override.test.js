// Regression: chat(input, { model, provider, ... }) must override createClaw defaults,
// and configure()/setModel()/setProvider() must update the persistent default.
// See: kenefe 2026-05-12 — "createClaw 以后设置了模型, 后面就修改不了"
import { describe, it, expect, beforeEach } from 'vitest'
import { createClaw } from '../src/index.js'

function installFakes() {
  const captured = []
  globalThis.agenticAsk = (input, config) => {
    captured.push({
      input,
      model: config.model,
      provider: config.provider,
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      proxyUrl: config.proxyUrl,
      system: config.system,
    })
    return (async function* () {
      yield { type: 'text_delta', text: 'ok' }
      yield { type: 'done', answer: 'ok', rounds: 1 }
    })()
  }
  globalThis.AgenticAgent = globalThis.agenticAsk
  globalThis.AgenticMemory = {
    createMemory({ systemPrompt } = {}) {
      const msgs = []
      return {
        id: 'default',
        async user(c) { msgs.push({ role: 'user', content: c }) },
        async assistant(c) { msgs.push({ role: 'assistant', content: c }) },
        messages() { return msgs.slice() },
        history() { return msgs.slice() },
        popLast() { msgs.pop() },
        info() { return { turns: msgs.length, messageCount: msgs.length, tokens: 0, maxTokens: 8000 } },
        clear() { msgs.length = 0 },
        destroy() {},
      }
    },
  }
  return captured
}

async function drain(gen) { for await (const _ of gen) {} }

describe('runtime model override', () => {
  let captured
  beforeEach(() => {
    captured = installFakes()
  })

  it('chat(opts) overrides model/provider/apiKey/baseUrl for that call only', async () => {
    const claw = createClaw({ apiKey: 'k1', provider: 'anthropic', model: 'claude-opus-4' })
    await drain(claw.chat('q1'))
    await drain(claw.chat('q2', { model: 'gpt-5', provider: 'openai', apiKey: 'k2', baseUrl: 'https://api.openai.com/v1' }))
    await drain(claw.chat('q3'))

    expect(captured[0].model).toBe('claude-opus-4')
    expect(captured[0].provider).toBe('anthropic')
    expect(captured[1].model).toBe('gpt-5')
    expect(captured[1].provider).toBe('openai')
    expect(captured[1].apiKey).toBe('k2')
    expect(captured[1].baseUrl).toBe('https://api.openai.com/v1')
    // Override does NOT persist
    expect(captured[2].model).toBe('claude-opus-4')
    expect(captured[2].provider).toBe('anthropic')
  })

  it('configure() updates the persistent default model/provider/apiKey', async () => {
    const claw = createClaw({ apiKey: 'k1', provider: 'anthropic', model: 'claude-opus-4' })
    await drain(claw.chat('q1'))
    claw.configure({ model: 'claude-sonnet-4', provider: 'openai', apiKey: 'k2' })
    await drain(claw.chat('q2'))
    expect(captured[1].model).toBe('claude-sonnet-4')
    expect(captured[1].provider).toBe('openai')
    expect(captured[1].apiKey).toBe('k2')
    expect(claw.getConfig().model).toBe('claude-sonnet-4')
  })

  it('setModel/setProvider/setApiKey update runtime config', async () => {
    const claw = createClaw({ apiKey: 'k1', provider: 'anthropic', model: 'a' })
    claw.setModel('b')
    await drain(claw.chat('q1'))
    expect(captured[0].model).toBe('b')

    claw.setProvider('custom', { apiKey: 'k3', baseUrl: 'http://x' })
    await drain(claw.chat('q2'))
    expect(captured[1].provider).toBe('custom')
    expect(captured[1].apiKey).toBe('k3')
    expect(captured[1].baseUrl).toBe('http://x')

    claw.setApiKey('k4')
    await drain(claw.chat('q3'))
    expect(captured[2].apiKey).toBe('k4')
  })

  it('chat opts can override systemPrompt', async () => {
    const claw = createClaw({ apiKey: 'k1', systemPrompt: 'you are a1' })
    await drain(claw.chat('q1'))
    await drain(claw.chat('q2', { system: 'you are a2' }))
    expect(captured[0].system).toBe('you are a1')
    expect(captured[1].system).toBe('you are a2')
  })

  it('emits configure event when config changes', async () => {
    const claw = createClaw({ apiKey: 'k1', model: 'a' })
    let seen = null
    claw.on('configure', (c) => { seen = c })
    claw.setModel('b')
    expect(seen?.model).toBe('b')
  })
})
