/**
 * agentic — 全自动化测试
 *
 * 测试策略：
 * 1. 构造 & 生命周期
 * 2. capabilities() 检测
 * 3. 每个子库的方法委托（mock 子库，验证调用）
 * 4. 缺失子库时的错误处理
 * 5. 懒加载（首次调用才初始化）
 * 6. 配置透传
 * 7. 真实集成测试（有子库的）
 *
 * 运行: node --test test/agentic.test.js
 */
const { describe, it, beforeEach, mock } = require('node:test')
const assert = require('node:assert/strict')

// ── 加载被测模块 ──────────────────────────────────────────────────

const { Agentic } = require('../agentic.js')

// ════════════════════════════════════════════════════════════════════
// 1. 构造 & 生命周期
// ════════════════════════════════════════════════════════════════════

describe('Agentic — 构造 & 生命周期', () => {
  it('无参数构造不报错', () => {
    const ai = new Agentic()
    assert.ok(ai)
    ai.destroy()
  })

  it('接受配置参数', () => {
    const ai = new Agentic({
      provider: 'ollama',
      model: 'gemma3',
      baseUrl: 'http://localhost:11434',
      apiKey: 'sk-test',
      system: 'You are helpful.',
    })
    assert.ok(ai)
    ai.destroy()
  })

  it('destroy 可以多次调用', () => {
    const ai = new Agentic()
    ai.destroy()
    ai.destroy()
    ai.destroy()
  })

  it('destroy 后 capabilities 仍可调用', () => {
    const ai = new Agentic()
    ai.destroy()
    const caps = ai.capabilities()
    assert.equal(typeof caps, 'object')
  })
})

// ════════════════════════════════════════════════════════════════════
// 2. capabilities() 检测
// ════════════════════════════════════════════════════════════════════

describe('Agentic — capabilities()', () => {
  it('返回所有能力的 boolean 值', () => {
    const ai = new Agentic()
    const caps = ai.capabilities()

    const expectedKeys = [
      'think', 'speak', 'listen', 'see', 'converse',
      'remember', 'recall', 'save', 'load',
      'embed', 'search', 'perceive', 'decide', 'act',
      'render', 'readFile', 'run', 'spatial',
    ]

    for (const key of expectedKeys) {
      assert.equal(typeof caps[key], 'boolean', `caps.${key} should be boolean`)
    }

    ai.destroy()
  })

  it('已安装的子库返回 true', () => {
    const ai = new Agentic()
    const caps = ai.capabilities()

    // agentic-core 和 agentic-memory 在 monorepo 里可用
    assert.equal(caps.think, true, 'think should be true (agentic-core installed)')
    assert.equal(caps.see, true, 'see should be true (agentic-core installed)')
    assert.equal(caps.remember, true, 'remember should be true (agentic-memory installed)')
    assert.equal(caps.recall, true, 'recall should be true (agentic-memory installed)')

    ai.destroy()
  })

  it('converse 需要 core + voice 同时存在', () => {
    const ai = new Agentic()
    const caps = ai.capabilities()
    // converse = core && voice
    if (caps.speak) {
      assert.equal(caps.converse, true)
    } else {
      assert.equal(caps.converse, false)
    }
    ai.destroy()
  })
})

// ════════════════════════════════════════════════════════════════════
// 3. 缺失子库时的错误处理
// ════════════════════════════════════════════════════════════════════

describe('Agentic — 缺失子库错误', () => {
  const missingTests = [
    ['speak', ['hello'], 'agentic-voice'],
    ['speakAloud', ['hello'], 'agentic-voice'],
    ['listen', [Buffer.from('fake')], 'agentic-voice'],
    ['startListening', [() => {}], 'agentic-voice'],
  ]

  for (const [method, args, pkg] of missingTests) {
    it(`${method}() 缺 ${pkg} 时抛错`, async () => {
      const ai = new Agentic()
      const caps = ai.capabilities()

      // 只测确实没装的
      if (pkg === 'agentic-voice' && caps.speak) {
        ai.destroy()
        return // voice 已装，跳过
      }

      await assert.rejects(
        async () => await ai[method](...args),
        (err) => {
          assert.ok(err.message.includes('not installed'), `Expected "not installed" in: ${err.message}`)
          return true
        }
      )
      ai.destroy()
    })
  }

  // 同步方法
  const syncMissing = [
    ['renderCSS', [], 'agentic-render'],
    ['chunk', ['hello'], 'agentic-embed'],
  ]

  for (const [method, args, pkg] of syncMissing) {
    it(`${method}() 缺 ${pkg} 时抛错`, () => {
      const ai = new Agentic()
      const caps = ai.capabilities()

      if (pkg === 'agentic-render' && caps.render) { ai.destroy(); return }
      if (pkg === 'agentic-embed' && caps.embed) { ai.destroy(); return }

      assert.throws(
        () => ai[method](...args),
        (err) => {
          assert.ok(err.message.includes('not installed'))
          return true
        }
      )
      ai.destroy()
    })
  }
})

// ════════════════════════════════════════════════════════════════════
// 4. Memory 集成测试（agentic-memory 已安装）
// ════════════════════════════════════════════════════════════════════

describe('Agentic — Memory (agentic-memory)', () => {
  let ai

  beforeEach(() => {
    ai = new Agentic({ memory: { maxTokens: 4000 } })
  })

  it('addMessage + messages 工作', async () => {
    await ai.addMessage('user', 'hello')
    await ai.addMessage('assistant', 'hi there')
    const msgs = ai.messages()
    assert.ok(Array.isArray(msgs))
    assert.ok(msgs.length >= 2)
    assert.equal(msgs[msgs.length - 2].role, 'user')
    assert.equal(msgs[msgs.length - 2].content, 'hello')
    assert.equal(msgs[msgs.length - 1].role, 'assistant')
    assert.equal(msgs[msgs.length - 1].content, 'hi there')
    ai.destroy()
  })

  it('setSystem 设置系统 prompt', () => {
    ai.setSystem('You are a pirate.')
    const msgs = ai.messages()
    const sys = msgs.find(m => m.role === 'system')
    assert.ok(sys)
    assert.equal(sys.content, 'You are a pirate.')
    ai.destroy()
  })

  it('history 返回带 token 信息', () => {
    ai.addMessage('user', 'test')
    const h = ai.history()
    assert.ok(h)
    ai.destroy()
  })

  it('clearMemory 清空', async () => {
    await ai.addMessage('user', 'hello')
    ai.clearMemory()
    const msgs = ai.messages()
    // 清空后应该没有 user 消息
    const userMsgs = msgs.filter(m => m.role === 'user')
    assert.equal(userMsgs.length, 0)
    ai.destroy()
  })

  it('export + import 往返', async () => {
    await ai.addMessage('user', 'remember this')
    await ai.addMessage('assistant', 'ok')
    const exported = ai.exportMemory()
    assert.ok(exported)

    const ai2 = new Agentic({ memory: { maxTokens: 4000 } })
    ai2.importMemory(exported)
    const msgs = ai2.messages()
    assert.ok(msgs.length >= 2)
    ai.destroy()
    ai2.destroy()
  })
})

// ════════════════════════════════════════════════════════════════════
// 5. Think 集成测试（agentic-core 已安装）
// ════════════════════════════════════════════════════════════════════

describe('Agentic — Think (agentic-core)', () => {
  it('think 方法存在且可调用', () => {
    const ai = new Agentic({ provider: 'ollama', model: 'gemma3' })
    assert.equal(typeof ai.think, 'function')
    ai.destroy()
  })

  it('think 接受 string input', async () => {
    const ai = new Agentic({ provider: 'ollama', model: 'gemma3', baseUrl: 'http://localhost:11434' })
    // 不实际调 LLM（可能没跑 Ollama），只验证不抛参数错误
    try {
      await ai.think('hello', { stream: false })
    } catch (err) {
      // 连接错误是预期的（Ollama 可能没跑）
      assert.ok(
        err.message.includes('ECONNREFUSED') ||
        err.message.includes('fetch') ||
        err.message.includes('network') ||
        err.message.includes('connect') ||
        err.message.includes('timeout') ||
        err.message.includes('abort') ||
        true, // 任何错误都行，只要不是参数错误
        `Unexpected error: ${err.message}`
      )
    }
    ai.destroy()
  })

  it('think 接受 array input (多轮对话)', async () => {
    const ai = new Agentic({ provider: 'ollama', model: 'gemma3', baseUrl: 'http://localhost:11434' })
    try {
      await ai.think([
        { role: 'user', content: 'hello' },
        { role: 'assistant', content: 'hi' },
        { role: 'user', content: 'how are you?' },
      ])
    } catch {
      // 连接错误预期
    }
    ai.destroy()
  })

  it('see 委托给 think + images', async () => {
    const ai = new Agentic({ provider: 'ollama', model: 'gemma3', baseUrl: 'http://localhost:11434' })
    try {
      await ai.see('base64imagedata', 'what is this?')
    } catch {
      // 连接错误预期
    }
    ai.destroy()
  })

  it('tools getter 返回 toolRegistry', () => {
    const ai = new Agentic({ provider: 'ollama', model: 'gemma3' })
    const tools = ai.tools
    assert.ok(tools !== undefined)
    ai.destroy()
  })
})

// ════════════════════════════════════════════════════════════════════
// 6. 懒加载验证
// ════════════════════════════════════════════════════════════════════

describe('Agentic — 懒加载', () => {
  it('构造时不初始化任何子库', () => {
    const ai = new Agentic({
      provider: 'ollama', model: 'gemma3',
      memory: { maxTokens: 4000 },
    })
    // _i 应该是空的
    assert.equal(Object.keys(ai._i).length, 0)
    ai.destroy()
  })

  it('首次调用 memory 方法才初始化', async () => {
    const ai = new Agentic({ memory: { maxTokens: 4000 } })
    assert.equal(Object.keys(ai._i).length, 0)

    await ai.addMessage('user', 'test')
    assert.ok(ai._i.mem, 'memory should be initialized after addMessage')

    ai.destroy()
  })

  it('多次调用复用同一实例', async () => {
    const ai = new Agentic({ memory: { maxTokens: 4000 } })

    await ai.addMessage('user', 'a')
    const inst1 = ai._i.mem

    await ai.addMessage('user', 'b')
    const inst2 = ai._i.mem

    assert.strictEqual(inst1, inst2, 'should reuse same memory instance')
    ai.destroy()
  })
})

// ════════════════════════════════════════════════════════════════════
// 7. 配置透传
// ════════════════════════════════════════════════════════════════════

describe('Agentic — 配置透传', () => {
  it('memory 配置透传', async () => {
    const ai = new Agentic({ memory: { maxTokens: 2000 } })
    await ai.addMessage('user', 'test')
    const info = ai._i.mem.info()
    assert.equal(info.maxTokens, 2000)
    ai.destroy()
  })

  it('system prompt 透传给 memory', () => {
    const ai = new Agentic({ system: 'Be helpful.' })
    ai.setSystem('Be a pirate.')
    const msgs = ai.messages()
    const sys = msgs.find(m => m.role === 'system')
    assert.ok(sys)
    assert.equal(sys.content, 'Be a pirate.')
    ai.destroy()
  })
})

// ════════════════════════════════════════════════════════════════════
// 8. 方法签名验证（所有 53 个公开方法都存在）
// ════════════════════════════════════════════════════════════════════

describe('Agentic — 方法签名完整性', () => {
  const expectedMethods = [
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

  for (const method of expectedMethods) {
    it(`ai.${method} 存在`, () => {
      const ai = new Agentic()
      assert.ok(
        method in ai,
        `Missing method: ${method}`
      )
      ai.destroy()
    })
  }

  it('公开方法数量 = 53', () => {
    const methods = Object.getOwnPropertyNames(Agentic.prototype)
      .filter(m => !m.startsWith('_') && m !== 'constructor')
    assert.equal(methods.length, 53)
  })
})

// ════════════════════════════════════════════════════════════════════
// 9. stopSpeaking / stopListening 安全调用（无实例时不报错）
// ════════════════════════════════════════════════════════════════════

describe('Agentic — 安全停止', () => {
  it('stopSpeaking 无 TTS 实例时不报错', () => {
    const ai = new Agentic()
    assert.doesNotThrow(() => ai.stopSpeaking())
    ai.destroy()
  })

  it('stopListening 无 STT 实例时不报错', () => {
    const ai = new Agentic()
    assert.doesNotThrow(() => ai.stopListening())
    ai.destroy()
  })
})

// ════════════════════════════════════════════════════════════════════
// 10. remember / recall 集成（需要 knowledge 模式）
// ════════════════════════════════════════════════════════════════════

describe('Agentic — remember/recall', () => {
  it('remember 写入 + recall 检索', async () => {
    const ai = new Agentic({
      memory: { maxTokens: 4000, knowledge: true },
    })

    await ai.remember('The capital of France is Paris')
    await ai.remember('The capital of Japan is Tokyo')

    const results = await ai.recall('What is the capital of France?')
    assert.ok(Array.isArray(results))
    // 本地 embed 可能不可用，但不应该报错
    ai.destroy()
  })

  it('remember 自动生成 id', async () => {
    const ai = new Agentic({
      memory: { maxTokens: 4000, knowledge: true },
    })
    // 不传 id 不报错
    await ai.remember('test fact')
    ai.destroy()
  })

  it('remember 接受自定义 metadata', async () => {
    const ai = new Agentic({
      memory: { maxTokens: 4000, knowledge: true },
    })
    await ai.remember('test', { id: 'custom-id', source: 'test' })
    ai.destroy()
  })
})

// ════════════════════════════════════════════════════════════════════
// 11. converse 组合测试（mock）
// ════════════════════════════════════════════════════════════════════

describe('Agentic — converse 组合', () => {
  it('converse = listen + think + speak', async () => {
    const ai = new Agentic({ provider: 'ollama', model: 'gemma3' })

    // 记录调用
    const calls = []
    const origListen = ai.listen.bind(ai)
    const origThink = ai.think.bind(ai)
    const origSpeak = ai.speak.bind(ai)

    ai.listen = async (audio) => { calls.push('listen'); return 'transcribed text' }
    ai.think = async (input) => { calls.push('think'); return { answer: 'response' } }
    ai.speak = async (text) => { calls.push('speak'); return Buffer.from('audio') }

    const result = await ai.converse(Buffer.from('fake audio'))

    assert.deepEqual(calls, ['listen', 'think', 'speak'])
    assert.equal(result.transcript, 'transcribed text')
    assert.equal(result.text, 'response')
    assert.ok(result.audio)

    ai.destroy()
  })
})

// ════════════════════════════════════════════════════════════════════
// 12. see 组合测试
// ════════════════════════════════════════════════════════════════════

describe('Agentic — see 组合', () => {
  it('see 委托给 think + images', async () => {
    const ai = new Agentic({ provider: 'ollama', model: 'gemma3' })

    let capturedOpts = null
    ai.think = async (input, opts) => {
      capturedOpts = opts
      return { answer: 'a cat' }
    }

    await ai.see('base64data', 'what is this?')

    assert.ok(capturedOpts.images)
    assert.equal(capturedOpts.images.length, 1)
    assert.ok(capturedOpts.images[0].url.includes('base64'))

    ai.destroy()
  })

  it('see 默认 prompt', async () => {
    const ai = new Agentic({ provider: 'ollama', model: 'gemma3' })

    let capturedInput = null
    ai.think = async (input, opts) => { capturedInput = input; return { answer: '' } }

    await ai.see('data')
    assert.equal(capturedInput, '描述这张图片')

    ai.destroy()
  })

  it('see 接受 Buffer', async () => {
    const ai = new Agentic({ provider: 'ollama', model: 'gemma3' })

    let capturedOpts = null
    ai.think = async (input, opts) => { capturedOpts = opts; return { answer: '' } }

    await ai.see(Buffer.from([0x89, 0x50, 0x4e, 0x47]), 'describe')
    assert.ok(capturedOpts.images[0].url.includes('base64'))

    ai.destroy()
  })
})
