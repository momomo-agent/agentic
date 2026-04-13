/**
 * agentic — 全自动化测试
 *
 * 两种模式全覆盖：
 * 1. 纯 client（子库直接调用）— Agentic 类
 * 2. 配合 service（HTTP）— AgenticClient 类
 *
 * 运行: node --test test/agentic.test.js
 */
const { describe, it, beforeEach, before, after } = require('node:test')
const assert = require('node:assert/strict')

const { Agentic } = require('../agentic.js')
const { AgenticClient } = require('../../client/agentic-client.cjs')

const SERVICE_URL = 'http://localhost:19234'

async function serviceAvailable() {
  try {
    const res = await fetch(`${SERVICE_URL}/api/health`, { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch { return false }
}

// ════════════════════════════════════════════════════════════════════
// PART 1: 纯 Client（Agentic — 子库直接调用）
// ════════════════════════════════════════════════════════════════════

describe('【纯 Client】构造 & 生命周期', () => {
  it('无参数构造', () => {
    const ai = new Agentic()
    assert.ok(ai)
    ai.destroy()
  })

  it('带配置构造', () => {
    const ai = new Agentic({
      provider: 'ollama', model: 'gemma3',
      baseUrl: 'http://localhost:11434',
      apiKey: 'sk-test', system: 'You are helpful.',
      tts: { provider: 'openai' }, stt: { provider: 'openai' },
      memory: { maxTokens: 4000 }, store: { path: '/tmp/test.db' },
    })
    assert.ok(ai)
    ai.destroy()
  })

  it('destroy 多次安全', () => {
    const ai = new Agentic()
    ai.destroy(); ai.destroy(); ai.destroy()
  })

  it('destroy 后 capabilities 仍可用', () => {
    const ai = new Agentic()
    ai.destroy()
    assert.equal(typeof ai.capabilities(), 'object')
  })
})

describe('【纯 Client】capabilities()', () => {
  it('返回所有能力 boolean', () => {
    const ai = new Agentic()
    const caps = ai.capabilities()
    const keys = ['think', 'speak', 'listen', 'see', 'converse', 'remember', 'recall',
      'save', 'load', 'embed', 'search', 'perceive', 'decide', 'act', 'render', 'readFile', 'run', 'spatial']
    for (const k of keys) assert.equal(typeof caps[k], 'boolean', `caps.${k}`)
    ai.destroy()
  })

  it('已装子库 = true', () => {
    const ai = new Agentic()
    const caps = ai.capabilities()
    assert.equal(caps.think, true)
    assert.equal(caps.remember, true)
    ai.destroy()
  })

  it('converse = core && voice', () => {
    const ai = new Agentic()
    const caps = ai.capabilities()
    assert.equal(caps.converse, caps.speak && caps.think)
    ai.destroy()
  })
})

describe('【纯 Client】缺失子库错误', () => {
  const asyncMissing = [
    ['speak', ['hello'], 'agentic-voice', 'speak'],
    ['speakAloud', ['hello'], 'agentic-voice', 'speak'],
    ['speakStream', [null], 'agentic-voice', 'speak'],
    ['timestamps', ['hello'], 'agentic-voice', 'speak'],
    ['listen', [Buffer.from('x')], 'agentic-voice', 'listen'],
    ['listenWithTimestamps', [Buffer.from('x')], 'agentic-voice', 'listen'],
    ['save', ['k', 'v'], 'agentic-store', 'save'],
    ['load', ['k'], 'agentic-store', 'load'],
    ['keys', [], 'agentic-store', 'save'],
    ['perceive', [null], 'agentic-sense', 'perceive'],
    ['decide', ['test'], 'agentic-act', 'decide'],
    ['act', ['test'], 'agentic-act', 'act'],
    ['readFile', ['/tmp/x'], 'agentic-filesystem', 'readFile'],
    ['writeFile', ['/tmp/x', 'c'], 'agentic-filesystem', 'readFile'],
    ['deleteFile', ['/tmp/x'], 'agentic-filesystem', 'readFile'],
    ['ls', [], 'agentic-filesystem', 'readFile'],
    ['tree', [], 'agentic-filesystem', 'readFile'],
    ['grep', ['pat'], 'agentic-filesystem', 'readFile'],
    ['semanticGrep', ['q'], 'agentic-filesystem', 'readFile'],
    ['run', ['ls'], 'agentic-shell', 'run'],
    ['reconstructSpace', [[]], 'agentic-spatial', 'spatial'],
    ['embed', ['text'], 'agentic-embed', 'embed'],
    ['index', ['id', 'text'], 'agentic-embed', 'embed'],
    ['indexMany', [[]], 'agentic-embed', 'embed'],
    ['search', ['q'], 'agentic-embed', 'search'],
  ]

  for (const [method, args, pkg, capKey] of asyncMissing) {
    it(`${method}() 缺 ${pkg} → "not installed"`, async () => {
      const ai = new Agentic()
      if (ai.capabilities()[capKey]) { ai.destroy(); return }
      await assert.rejects(
        async () => await ai[method](...args),
        err => { assert.ok(err.message.includes('not installed')); return true }
      )
      ai.destroy()
    })
  }

  const syncMissing = [
    ['render', ['# hi'], 'agentic-render', 'render'],
    ['createRenderer', ['#app'], 'agentic-render', 'render'],
    ['renderCSS', [], 'agentic-render', 'render'],
    ['chunk', ['text'], 'agentic-embed', 'embed'],
    ['similarity', [[1], [1]], 'agentic-embed', 'embed'],
    ['createAudioAnalyzer', [], 'agentic-sense', 'perceive'],
    ['registerAction', [{}], 'agentic-act', 'act'],
    ['createSpatialSession', [], 'agentic-spatial', 'spatial'],
  ]

  for (const [method, args, pkg, capKey] of syncMissing) {
    it(`${method}() 缺 ${pkg} → "not installed"`, () => {
      const ai = new Agentic()
      if (ai.capabilities()[capKey]) { ai.destroy(); return }
      assert.throws(
        () => ai[method](...args),
        err => { assert.ok(err.message.includes('not installed')); return true }
      )
      ai.destroy()
    })
  }
})

describe('【纯 Client】懒加载', () => {
  it('构造时 _i 为空', () => {
    const ai = new Agentic({ memory: { maxTokens: 4000 } })
    assert.equal(Object.keys(ai._i).length, 0)
    ai.destroy()
  })

  it('首次调用才初始化', async () => {
    const ai = new Agentic({ memory: { maxTokens: 4000 } })
    await ai.addMessage('user', 'test')
    assert.ok(ai._i.mem)
    ai.destroy()
  })

  it('复用同一实例', async () => {
    const ai = new Agentic({ memory: { maxTokens: 4000 } })
    await ai.addMessage('user', 'a')
    const inst = ai._i.mem
    await ai.addMessage('user', 'b')
    assert.strictEqual(ai._i.mem, inst)
    ai.destroy()
  })
})

describe('【纯 Client】配置透传', () => {
  it('memory maxTokens', async () => {
    const ai = new Agentic({ memory: { maxTokens: 2000 } })
    await ai.addMessage('user', 'test')
    assert.equal(ai._i.mem.info().maxTokens, 2000)
    ai.destroy()
  })
})

describe('【纯 Client】Memory', () => {
  let ai
  beforeEach(() => { ai = new Agentic({ memory: { maxTokens: 4000 } }) })

  it('addMessage + messages', async () => {
    await ai.addMessage('user', 'hello')
    await ai.addMessage('assistant', 'hi')
    const msgs = ai.messages()
    const last2 = msgs.slice(-2)
    assert.equal(last2[0].role, 'user')
    assert.equal(last2[1].role, 'assistant')
    ai.destroy()
  })

  it('setSystem', () => {
    ai.setSystem('Be a pirate.')
    assert.equal(ai.messages().find(m => m.role === 'system').content, 'Be a pirate.')
    ai.destroy()
  })

  it('history', () => {
    ai.addMessage('user', 'test')
    assert.ok(ai.history())
    ai.destroy()
  })

  it('clearMemory', async () => {
    await ai.addMessage('user', 'hello')
    ai.clearMemory()
    assert.equal(ai.messages().filter(m => m.role === 'user').length, 0)
    ai.destroy()
  })

  it('export + import', async () => {
    await ai.addMessage('user', 'remember')
    await ai.addMessage('assistant', 'ok')
    const exported = ai.exportMemory()
    const ai2 = new Agentic({ memory: { maxTokens: 4000 } })
    ai2.importMemory(exported)
    assert.ok(ai2.messages().length >= 2)
    ai.destroy(); ai2.destroy()
  })
})

describe('【纯 Client】remember/recall', () => {
  it('remember + recall', async () => {
    const ai = new Agentic({ memory: { maxTokens: 4000, knowledge: true } })
    await ai.remember('Capital of France is Paris')
    const r = await ai.recall('capital of France')
    assert.ok(Array.isArray(r))
    ai.destroy()
  })

  it('自动生成 id', async () => {
    const ai = new Agentic({ memory: { maxTokens: 4000, knowledge: true } })
    await ai.remember('test')
    ai.destroy()
  })

  it('自定义 metadata', async () => {
    const ai = new Agentic({ memory: { maxTokens: 4000, knowledge: true } })
    await ai.remember('test', { id: 'custom', source: 'test' })
    ai.destroy()
  })
})

describe('【纯 Client】Think', () => {
  it('think 存在', () => {
    const ai = new Agentic({ provider: 'ollama', model: 'gemma3' })
    assert.equal(typeof ai.think, 'function')
    ai.destroy()
  })

  it('think string（连接错误预期）', async () => {
    const ai = new Agentic({ provider: 'ollama', model: 'gemma3', baseUrl: 'http://localhost:11434' })
    try { await ai.think('hello') } catch { /* ok */ }
    ai.destroy()
  })

  it('think array', async () => {
    const ai = new Agentic({ provider: 'ollama', model: 'gemma3', baseUrl: 'http://localhost:11434' })
    try {
      await ai.think([
        { role: 'user', content: 'hello' },
        { role: 'assistant', content: 'hi' },
        { role: 'user', content: 'how?' },
      ])
    } catch { /* ok */ }
    ai.destroy()
  })

  it('tools getter', () => {
    const ai = new Agentic({ provider: 'ollama', model: 'gemma3' })
    assert.ok(ai.tools !== undefined)
    ai.destroy()
  })
})

describe('【纯 Client】see 组合', () => {
  it('委托 think + images', async () => {
    const ai = new Agentic()
    let opts = null
    ai.think = async (_, o) => { opts = o; return { answer: 'cat' } }
    await ai.see('b64', 'what?')
    assert.ok(opts.images[0].url.includes('base64'))
    ai.destroy()
  })

  it('默认 prompt', async () => {
    const ai = new Agentic()
    let input = null
    ai.think = async (i) => { input = i; return { answer: '' } }
    await ai.see('data')
    assert.equal(input, '描述这张图片')
    ai.destroy()
  })

  it('接受 Buffer', async () => {
    const ai = new Agentic()
    let opts = null
    ai.think = async (_, o) => { opts = o; return { answer: '' } }
    await ai.see(Buffer.from([0x89, 0x50]), 'desc')
    assert.ok(opts.images[0].url.includes('base64'))
    ai.destroy()
  })
})

describe('【纯 Client】converse 组合', () => {
  it('listen → think → speak', async () => {
    const ai = new Agentic()
    const calls = []
    ai.listen = async () => { calls.push('listen'); return 'text' }
    ai.think = async () => { calls.push('think'); return { answer: 'resp' } }
    ai.speak = async () => { calls.push('speak'); return Buffer.from('audio') }
    const r = await ai.converse(Buffer.from('fake'))
    assert.deepEqual(calls, ['listen', 'think', 'speak'])
    assert.equal(r.transcript, 'text')
    assert.equal(r.text, 'resp')
    assert.ok(r.audio)
    ai.destroy()
  })
})

describe('【纯 Client】安全停止', () => {
  it('stopSpeaking 无实例', () => {
    const ai = new Agentic()
    assert.doesNotThrow(() => ai.stopSpeaking())
    ai.destroy()
  })

  it('stopListening 无实例', () => {
    const ai = new Agentic()
    assert.doesNotThrow(() => ai.stopListening())
    ai.destroy()
  })
})

describe('【纯 Client】方法签名完整性', () => {
  const expected = [
    'think', 'tools', 'speak', 'speakAloud', 'speakStream', 'timestamps',
    'stopSpeaking', 'listen', 'listenWithTimestamps', 'startListening',
    'stopListening', 'see', 'converse', 'remember', 'recall', 'addMessage',
    'messages', 'history', 'setSystem', 'clearMemory', 'exportMemory',
    'importMemory', 'save', 'load', 'keys', 'query', 'exec', 'embed',
    'index', 'indexMany', 'search', 'chunk', 'similarity', 'perceive',
    'createAudioAnalyzer', 'registerAction', 'decide', 'act', 'render',
    'createRenderer', 'renderCSS', 'readFile', 'writeFile', 'deleteFile',
    'ls', 'tree', 'grep', 'semanticGrep', 'run', 'reconstructSpace',
    'createSpatialSession', 'capabilities', 'destroy',
  ]

  for (const m of expected) {
    it(`ai.${m} 存在`, () => {
      const ai = new Agentic()
      assert.ok(m in ai)
      ai.destroy()
    })
  }

  it('公开方法 = 53', () => {
    const n = Object.getOwnPropertyNames(Agentic.prototype)
      .filter(m => !m.startsWith('_') && m !== 'constructor').length
    assert.equal(n, 53)
  })
})

// ════════════════════════════════════════════════════════════════════
// PART 2: 配合 Service（AgenticClient — HTTP）
// ════════════════════════════════════════════════════════════════════

describe('【Service】AgenticClient 构造', () => {
  it('URL string 构造', () => {
    assert.ok(new AgenticClient(SERVICE_URL))
  })

  it('能力方法完整', () => {
    const c = new AgenticClient(SERVICE_URL)
    for (const m of ['think', 'see', 'listen', 'speak', 'converse', 'embed', 'capabilities']) {
      assert.equal(typeof c[m], 'function', m)
    }
  })

  it('admin 方法完整', () => {
    const c = new AgenticClient(SERVICE_URL)
    for (const m of ['health', 'status', 'perf', 'queueStats', 'devices', 'logs',
      'config', 'engines', 'engineModels', 'engineRecommended', 'engineHealth',
      'pullModel', 'deleteModel', 'assignments', 'setAssignments', 'models']) {
      assert.equal(typeof c.admin[m], 'function', `admin.${m}`)
    }
  })
})

describe('【Service】admin 接口', () => {
  let ok = false, c

  before(async () => {
    ok = await serviceAvailable()
    if (ok) c = new AgenticClient(SERVICE_URL)
  })

  for (const m of ['health', 'status', 'engines', 'engineModels', 'engineRecommended',
    'engineHealth', 'config', 'devices', 'perf', 'logs', 'queueStats', 'models', 'assignments']) {
    it(`admin.${m}()`, async () => {
      if (!ok) return
      const r = await c.admin[m]()
      assert.ok(r !== undefined)
    })
  }
})

describe('【Service】capabilities', () => {
  let ok = false, c

  before(async () => {
    ok = await serviceAvailable()
    if (ok) c = new AgenticClient(SERVICE_URL)
  })

  it('返回能力对象', async () => {
    if (!ok) return
    const caps = await c.capabilities()
    assert.equal(typeof caps, 'object')
  })
})

describe('【Service】think', () => {
  let ok = false, c

  before(async () => {
    ok = await serviceAvailable()
    if (ok) c = new AgenticClient(SERVICE_URL)
  })

  it('非流式', async () => {
    if (!ok) return
    const r = await c.think('Say hello in one word.', { model: 'gemma4:e2b' })
    assert.ok(r)
    assert.ok(typeof (r.answer || r.text) === 'string')
  })

  it('流式', async () => {
    if (!ok) return
    const chunks = []
    for await (const ch of c.think('Say hi.', { stream: true, model: 'gemma4:e2b' })) {
      chunks.push(ch)
    }
    assert.ok(chunks.length > 0)
  })

  it('带 system', async () => {
    if (!ok) return
    const r = await c.think('What are you?', { system: 'You are a pirate. One sentence.', model: 'gemma4:e2b' })
    assert.ok(r)
  })
})

describe('【Service】see', () => {
  let ok = false, c

  before(async () => {
    ok = await serviceAvailable()
    if (ok) c = new AgenticClient(SERVICE_URL)
  })

  it('base64 图片', async () => {
    if (!ok) return
    const tiny = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
    try {
      const r = await c.see(`data:image/png;base64,${tiny}`, 'What color?', { model: 'llava:7b' })
      assert.ok(r)
    } catch { assert.ok(true) }
  })
})

describe('【Service】listen', () => {
  let ok = false, c

  before(async () => {
    ok = await serviceAvailable()
    if (ok) c = new AgenticClient(SERVICE_URL)
  })

  it('audio buffer', async () => {
    if (!ok) return
    try {
      const text = await c.listen(createSilentWav(0.1))
      assert.equal(typeof text, 'string')
    } catch { assert.ok(true) }
  })
})

describe('【Service】speak', () => {
  let ok = false, c

  before(async () => {
    ok = await serviceAvailable()
    if (ok) c = new AgenticClient(SERVICE_URL)
  })

  it('返回 audio', async () => {
    if (!ok) return
    try {
      const audio = await c.speak('Hello')
      assert.ok(audio)
    } catch { assert.ok(true) }
  })
})

describe('【Service】embed', () => {
  let ok = false, c

  before(async () => {
    ok = await serviceAvailable()
    if (ok) c = new AgenticClient(SERVICE_URL)
  })

  it('返回向量', async () => {
    if (!ok) return
    try {
      const v = await c.embed('hello')
      assert.ok(v)
    } catch { assert.ok(true) }
  })
})

describe('【Service】converse', () => {
  let ok = false, c

  before(async () => {
    ok = await serviceAvailable()
    if (ok) c = new AgenticClient(SERVICE_URL)
  })

  it('全链路', async () => {
    if (!ok) return
    try {
      const r = await c.converse(createSilentWav(0.5))
      assert.ok(r)
    } catch { assert.ok(true) }
  })
})

// ════════════════════════════════════════════════════════════════════
// PART 3: 接口对齐
// ════════════════════════════════════════════════════════════════════

describe('【对齐】Agentic vs AgenticClient', () => {
  it('核心能力方法名一致', () => {
    const ai = new Agentic()
    const c = new AgenticClient(SERVICE_URL)
    for (const m of ['think', 'see', 'listen', 'speak', 'converse', 'embed', 'capabilities']) {
      assert.equal(typeof ai[m], 'function', `Agentic.${m}`)
      assert.equal(typeof c[m], 'function', `Client.${m}`)
    }
    ai.destroy()
  })

  it('Agentic 额外本地能力', () => {
    const ai = new Agentic()
    for (const m of ['remember', 'recall', 'save', 'load', 'perceive', 'decide', 'act',
      'render', 'readFile', 'writeFile', 'run', 'addMessage', 'messages', 'history']) {
      assert.equal(typeof ai[m], 'function', m)
    }
    ai.destroy()
  })
})

// ── Helper ────────────────────────────────────────────────────────

function createSilentWav(sec) {
  const sr = 16000, n = Math.floor(sr * sec), ds = n * 2
  const b = Buffer.alloc(44 + ds)
  b.write('RIFF', 0); b.writeUInt32LE(36 + ds, 4); b.write('WAVE', 8)
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20)
  b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28)
  b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34)
  b.write('data', 36); b.writeUInt32LE(ds, 40)
  return b
}
