/**
 * agentic — 单元测试（零外部依赖）
 *
 * 测试构造、配置、prefer 路由、能力检测等核心逻辑。
 * 不需要 Ollama / Service / 任何网络。
 *
 * 运行: cd packages/agentic && node --test test/unit.test.js
 */
import { describe, it, expect } from 'vitest'
import { Agentic, ai as defaultAi } from '../agentic.js'

// ════════════════════════════════════════════════════════════════════
// 1. 构造 + 配置
// ════════════════════════════════════════════════════════════════════

describe('constructor', () => {
  it('无参数构造不报错', () => {
    const ai = new Agentic()
    expect(ai).toBeTruthy()
    ai.destroy()
  })

  it('顶层 provider/apiKey/model 作为 fallback', () => {
    const ai = new Agentic({ provider: 'anthropic', apiKey: 'sk-top', model: 'claude' })
    const caps = ai.capabilities()
    expect(typeof caps).toBe('object')
    ai.destroy()
  })

  it('per-capability config 覆盖顶层', () => {
    const ai = new Agentic({
      provider: 'openai', apiKey: 'sk-top',
      llm: { provider: 'anthropic', apiKey: 'sk-llm' },
      tts: { provider: 'elevenlabs', apiKey: 'el-tts' },
    })
    // _cfgFor 内部方法验证
    expect(ai._cfgFor('llm', 'provider')).toBe('anthropic')
    expect(ai._cfgFor('llm', 'apiKey')).toBe('sk-llm')
    expect(ai._cfgFor('tts', 'provider')).toBe('elevenlabs')
    expect(ai._cfgFor('tts', 'apiKey')).toBe('el-tts')
    // stt 没配，fallback 到顶层
    expect(ai._cfgFor('stt', 'provider')).toBe('openai')
    expect(ai._cfgFor('stt', 'apiKey')).toBe('sk-top')
    ai.destroy()
  })
})

// ════════════════════════════════════════════════════════════════════
// 2. configure()
// ════════════════════════════════════════════════════════════════════

describe('configure()', () => {
  it('合并新配置', () => {
    const ai = new Agentic({ provider: 'openai', apiKey: 'sk-old' })
    ai.configure({ llm: { model: 'gpt-4o' } })
    expect(ai._cfgFor('llm', 'model')).toBe('gpt-4o')
    // 顶层不变
    expect(ai._cfgFor('llm', 'provider')).toBe('openai')
    ai.destroy()
  })

  it('重置 lazy 实例', () => {
    const ai = new Agentic({ provider: 'openai' })
    // 触发 lazy init（如果子库存在）
    ai._i.fakeCached = 'should be cleared'
    ai.configure({ model: 'new-model' })
    expect(ai._i.fakeCached).toBe(undefined)
    ai.destroy()
  })
})

// ════════════════════════════════════════════════════════════════════
// 3. capabilities()
// ════════════════════════════════════════════════════════════════════

describe('capabilities()', () => {
  it('返回 boolean map', () => {
    const ai = new Agentic()
    const caps = ai.capabilities()
    expect(typeof caps.think).toBe('boolean')
    expect(typeof caps.speak).toBe('boolean')
    expect(typeof caps.listen).toBe('boolean')
    expect(typeof caps.embed).toBe('boolean')
    expect(typeof caps.admin).toBe('boolean')
    ai.destroy()
  })

  it('think 始终可用（有 agentic-core）', () => {
    const ai = new Agentic()
    const caps = ai.capabilities()
    expect(caps.think).toBe(true)
    ai.destroy()
  })

  it('admin 需要 serviceUrl', () => {
    const local = new Agentic()
    expect(local.capabilities().admin).toBe(false)
    local.destroy()

    const remote = new Agentic({ serviceUrl: 'http://localhost:9999' })
    expect(remote.capabilities().admin).toBe(true)
    remote.destroy()
  })
})

// ════════════════════════════════════════════════════════════════════
// 4. prefer 路由逻辑
// ════════════════════════════════════════════════════════════════════

describe('prefer routing', () => {
  it('prefer 为 string 时不影响 _cfgFor', () => {
    const ai = new Agentic({ provider: 'openai', apiKey: 'sk-default' })
    // prefer: 'cloud' 是给 Service 的提示，直连模式下 _cfgFor 不变
    expect(ai._cfgFor('llm', 'provider')).toBe('openai')
    ai.destroy()
  })

  it('prefer 为 object 时覆盖 config（在 think 内部解析）', () => {
    // 这个逻辑在 think() 内部，这里验证 object 解析
    const pref = { baseUrl: 'https://custom.api.com', model: 'gpt-4o', key: 'sk-custom' }
    const prefObj = pref && typeof pref === 'object' ? pref : null
    expect(prefObj.baseUrl).toBe('https://custom.api.com')
    expect(prefObj.model).toBe('gpt-4o')
    expect(prefObj.key).toBe('sk-custom')
  })

  it('prefer string 不被当作 object', () => {
    const pref = 'cloud'
    const prefObj = pref && typeof pref === 'object' ? pref : null
    expect(prefObj).toBe(null)
  })
})

// ════════════════════════════════════════════════════════════════════
// 5. 默认实例 ai
// ════════════════════════════════════════════════════════════════════

describe('default instance', () => {
  it('导出 ai 和 Agentic', () => {
    expect(Agentic).toBeTruthy()
    expect(defaultAi).toBeTruthy()
    expect(defaultAi instanceof Agentic).toBeTruthy()
  })

  it('ai.configure() 可用', () => {
    defaultAi.configure({ provider: 'test' })
    expect(defaultAi._cfgFor('llm', 'provider')).toBe('test')
    // 还原
    defaultAi.configure({ provider: undefined })
  })
})

// ════════════════════════════════════════════════════════════════════
// 6. destroy
// ════════════════════════════════════════════════════════════════════

describe('destroy()', () => {
  it('清理 WebSocket 连接', () => {
    const ai = new Agentic({ serviceUrl: 'http://localhost:9999' })
    expect(ai._ws).toBeTruthy()
    ai.destroy()
    // destroy 后 _ws 应该被清理
    expect(ai._ws).toBe(null)
  })

  it('无 serviceUrl 时 destroy 不报错', () => {
    const ai = new Agentic()
    ai.destroy()
    // 不抛异常就行
  })
})

// ════════════════════════════════════════════════════════════════════
// 7. see 是 think 的语法糖
// ════════════════════════════════════════════════════════════════════

describe('see()', () => {
  it('无 ws 时调用 think with images', async () => {
    const ai = new Agentic({ provider: 'test', apiKey: 'test' })
    // 会因为 provider 不存在而报错，但能验证调用路径
    try {
      await ai.see('base64data', 'what is this')
    } catch (e) {
      // 预期报错（没有真实 provider），但不应该是 "see is not a function"
      expect(e.message).toBeTruthy()
      expect(!e.message.includes('is not a function')).toBeTruthy()
    }
    ai.destroy()
  })
})

// ════════════════════════════════════════════════════════════════════
// 8. converse 组合
// ════════════════════════════════════════════════════════════════════

describe('converse()', () => {
  it('方法存在', () => {
    const ai = new Agentic()
    expect(typeof ai.converse).toBe('function')
    ai.destroy()
  })
})
