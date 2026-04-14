/**
 * agentic — 真实集成测试（零 mock）
 *
 * 所有测试真实调用子库。需要 Ollama 在 localhost:11434。
 *
 * 运行: cd packages/agentic && node --test test/agentic.test.js
 */
const { describe, it, before, after, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')

const { Agentic } = require('../agentic.js')

const OLLAMA = {
  provider: 'ollama',
  model: 'qwen3:0.6b',
  baseUrl: 'http://localhost:11434',
  apiKey: 'ollama',
}

const DB = '/tmp/agentic-real-test.db'
function cleanDB() {
  for (const f of [DB, DB + '-wal', DB + '-shm']) {
    try { fs.unlinkSync(f) } catch {}
  }
}

// ════════════════════════════════════════════════════════════════════
// 1. THINK — agentic-core (真实 Ollama LLM)
// ════════════════════════════════════════════════════════════════════

describe('think — 真实 LLM', () => {
  it('基本问答返回字符串', async () => {
    const ai = new Agentic({ ...OLLAMA, tools: [] })
    const r = await ai.think('Reply with exactly one word: PONG')
    assert.equal(typeof r, 'string')
    assert.ok(r.length > 0)
    ai.destroy()
  })

  it('带 system prompt', async () => {
    const ai = new Agentic({ ...OLLAMA, system: 'Always reply in exactly 3 words.', tools: [] })
    const r = await ai.think('Hello')
    assert.equal(typeof r, 'string')
    assert.ok(r.length > 0)
    ai.destroy()
  })

  it('onEvent 回调触发', async () => {
    const events = []
    const ai = new Agentic({ ...OLLAMA, tools: [] })
    await ai.think('Say hi', { onEvent: (type, data) => events.push(type) })
    assert.ok(events.length > 0, 'should emit events')
    assert.ok(events.includes('status'), 'should have status event')
    ai.destroy()
  })

  it('history 多轮对话', async () => {
    const ai = new Agentic({ ...OLLAMA, tools: [] })
    const r = await ai.think('What is my name?', {
      history: [
        { role: 'user', content: 'My name is TestBot' },
        { role: 'assistant', content: 'Nice to meet you, TestBot!' },
      ]
    })
    assert.equal(typeof r, 'string')
    ai.destroy()
  })

  it('raw 模式返回完整对象', async () => {
    const ai = new Agentic({ ...OLLAMA, tools: [] })
    const r = await ai.think('Say hi', { raw: true })
    assert.equal(typeof r, 'object')
    assert.ok('answer' in r, 'should have answer field')
    assert.ok('rounds' in r, 'should have rounds field')
    ai.destroy()
  })
})

// ════════════════════════════════════════════════════════════════════
// 2. STORE — agentic-store (真实 SQLite)
// ════════════════════════════════════════════════════════════════════

describe('store — 真实 SQLite', () => {
  beforeEach(cleanDB)

  it('save / load 基本类型', async () => {
    const ai = new Agentic({ store: { path: DB } })
    await ai.save('str', 'hello')
    await ai.save('num', 42)
    await ai.save('obj', { a: 1, b: [2, 3] })
    await ai.save('bool', true)

    assert.equal(await ai.load('str'), 'hello')
    assert.equal(await ai.load('num'), 42)
    assert.deepEqual(await ai.load('obj'), { a: 1, b: [2, 3] })
    assert.equal(await ai.load('bool'), true)
    ai.destroy()
  })

  it('has / keys / deleteKey', async () => {
    const ai = new Agentic({ store: { path: DB } })
    await ai.save('x', 1)
    await ai.save('y', 2)

    assert.equal(await ai.has('x'), true)
    assert.equal(await ai.has('z'), false)

    const keys = await ai.keys()
    assert.ok(keys.includes('x'))
    assert.ok(keys.includes('y'))

    await ai.deleteKey('x')
    assert.equal(await ai.has('x'), false)
    ai.destroy()
  })

  it('覆盖写入', async () => {
    const ai = new Agentic({ store: { path: DB } })
    await ai.save('k', 'v1')
    assert.equal(await ai.load('k'), 'v1')
    await ai.save('k', 'v2')
    assert.equal(await ai.load('k'), 'v2')
    ai.destroy()
  })

  it('raw SQL — exec + sql + query', async () => {
    const db = '/tmp/agentic-sql-test.db'
    for (const f of [db, db+'-wal', db+'-shm']) { try { fs.unlinkSync(f) } catch {} }
    const ai = new Agentic({ store: { path: db } })
    await ai.exec('CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY, name TEXT, score REAL)')
    await ai.sql('INSERT INTO items (name, score) VALUES (?, ?)', ['alpha', 9.5])
    await ai.sql('INSERT INTO items (name, score) VALUES (?, ?)', ['beta', 7.2])
    await ai.sql('INSERT INTO items (name, score) VALUES (?, ?)', ['gamma', 8.8])

    const rows = await ai.query('SELECT name, score FROM items ORDER BY score DESC')
    assert.equal(rows.length, 3)
    assert.equal(rows[0].name, 'alpha')
    assert.equal(rows[2].name, 'beta')
    ai.destroy()
  })

  it('大量数据', async () => {
    const db = '/tmp/agentic-bulk-test.db'
    for (const f of [db, db+'-wal', db+'-shm']) { try { fs.unlinkSync(f) } catch {} }
    const ai = new Agentic({ store: { path: db } })
    for (let i = 0; i < 100; i++) {
      await ai.save(`item_${i}`, { index: i, data: `value_${i}` })
    }
    const keys = await ai.keys()
    assert.equal(keys.length, 100)
    assert.deepEqual(await ai.load('item_50'), { index: 50, data: 'value_50' })
    ai.destroy()
  })
})

// ════════════════════════════════════════════════════════════════════
// 3. FILESYSTEM — agentic-filesystem (真实内存 FS)
// ════════════════════════════════════════════════════════════════════

describe('filesystem — 真实内存 FS', () => {
  it('write / read / ls', async () => {
    const ai = new Agentic()
    await ai.writeFile('/hello.txt', 'hello world')
    await ai.writeFile('/docs/readme.md', '# Title\nContent here')

    assert.equal(await ai.readFile('/hello.txt'), 'hello world')
    assert.equal(await ai.readFile('/docs/readme.md'), '# Title\nContent here')

    const root = await ai.ls('/')
    assert.ok(root.some(e => e.includes('hello.txt')))
    assert.ok(root.some(e => e.includes('docs')))
    ai.destroy()
  })

  it('tree', async () => {
    const ai = new Agentic()
    await ai.writeFile('/a/b/c.txt', 'deep')
    await ai.writeFile('/a/d.txt', 'shallow')

    const tree = await ai.tree('/')
    assert.ok(tree, 'tree should return something')
    ai.destroy()
  })

  it('grep', async () => {
    const ai = new Agentic()
    await ai.writeFile('/file1.txt', 'hello world')
    await ai.writeFile('/file2.txt', 'goodbye world')
    await ai.writeFile('/file3.txt', 'nothing here')

    const results = await ai.grep('world')
    assert.ok(results.length >= 2, `expected >=2 matches, got ${results.length}`)
    ai.destroy()
  })

  it('deleteFile', async () => {
    const ai = new Agentic()
    await ai.writeFile('/temp.txt', 'temporary')
    assert.equal(await ai.readFile('/temp.txt'), 'temporary')

    await ai.deleteFile('/temp.txt')
    const ls = await ai.ls('/')
    assert.ok(!ls.some(e => e.includes('temp.txt')), 'file should be deleted')
    ai.destroy()
  })

  it('覆盖写入', async () => {
    const ai = new Agentic()
    await ai.writeFile('/f.txt', 'v1')
    assert.equal(await ai.readFile('/f.txt'), 'v1')
    await ai.writeFile('/f.txt', 'v2')
    assert.equal(await ai.readFile('/f.txt'), 'v2')
    ai.destroy()
  })
})

// ════════════════════════════════════════════════════════════════════
// 4. EMBED — agentic-embed (真实向量)
// ════════════════════════════════════════════════════════════════════

describe('embed — 真实向量', () => {
  it('embed 生成向量', async () => {
    const ai = new Agentic({ embed: { provider: 'local' } })
    const vec = await ai.embed('hello world')
    assert.ok(Array.isArray(vec), 'should return array')
    assert.ok(vec.length > 0, 'vector should have dimensions')
    assert.ok(typeof vec[0] === 'number', 'elements should be numbers')
    ai.destroy()
  })

  it('index + search 语义检索', async () => {
    const ai = new Agentic({ embed: { provider: 'local' } })
    await ai.index('paris', 'The capital of France is Paris')
    await ai.index('tokyo', 'The capital of Japan is Tokyo')
    await ai.index('python', 'Python is a programming language')
    await ai.index('rust', 'Rust is a systems programming language')

    const results = await ai.search('France capital city')
    assert.ok(results.length > 0)
    assert.equal(results[0].id, 'paris')
    ai.destroy()
  })

  it('similarity 计算', async () => {
    const ai = new Agentic({ embed: { provider: 'local' } })
    // 用更长的文本让 TF-IDF 有区分度
    const a = await ai.embed('The cat sat on the mat and purred softly')
    const b = await ai.embed('The kitten sat on the rug and purred gently')
    const c = await ai.embed('Database management systems use SQL queries for data retrieval')

    const sim_ab = ai.similarity(a, b)
    const sim_ac = ai.similarity(a, c)
    assert.ok(typeof sim_ab === 'number')
    assert.ok(typeof sim_ac === 'number')
    // 相似文本的相似度应该更高
    assert.ok(sim_ab > sim_ac, `cat-kitten (${sim_ab.toFixed(3)}) should be > cat-database (${sim_ac.toFixed(3)})`)
    ai.destroy()
  })

  it('chunk 文本分块', () => {
    const ai = new Agentic({ embed: { provider: 'local' } })
    // 用有句号的文本让 chunkText 能按句子分割
    const sentences = Array.from({ length: 20 }, (_, i) => `This is sentence number ${i} with some extra words to make it longer.`)
    const text = sentences.join(' ')
    const chunks = ai.chunk(text, { maxChunkSize: 200 })
    assert.ok(chunks.length > 1, `should split into multiple chunks, got ${chunks.length}`)
    assert.ok(chunks.every(c => c.length > 0), 'all chunks should be non-empty')
    ai.destroy()
  })

  it('indexMany 批量索引', async () => {
    const ai = new Agentic({ embed: { provider: 'local' } })
    await ai.indexMany([
      { id: 'd1', text: 'Machine learning is a subset of AI' },
      { id: 'd2', text: 'Deep learning uses neural networks' },
      { id: 'd3', text: 'Cooking pasta requires boiling water' },
    ])
    const results = await ai.search('artificial intelligence')
    assert.ok(results.length > 0)
    assert.ok(['d1', 'd2'].includes(results[0].id), `top result should be AI-related, got ${results[0].id}`)
    ai.destroy()
  })
})

// ════════════════════════════════════════════════════════════════════
// 5. MEMORY — agentic-memory (真实 remember/recall)
// ════════════════════════════════════════════════════════════════════

describe('memory — 真实 remember/recall', () => {
  it('remember + recall', async () => {
    const ai = new Agentic()
    await ai.remember('The meeting is at 3pm on Tuesday')
    await ai.remember('Buy milk and eggs from the store')
    await ai.remember('The project deadline is next Friday')

    const results = await ai.recall('When is the meeting?')
    assert.ok(results.length > 0, 'should recall something')
    // recall 返回 [{id, chunk, score, ...}]
    const texts = results.map(r => r.chunk || r.text || '')
    assert.ok(texts.some(t => t.includes('meeting')), 'should find meeting-related memory')
  })

  it('addMessage + messages + history', () => {
    const ai = new Agentic()
    ai.addMessage('user', 'Hello')
    ai.addMessage('assistant', 'Hi there!')
    ai.addMessage('user', 'How are you?')

    const msgs = ai.messages()
    assert.equal(msgs.length, 3)
    assert.equal(msgs[0].role, 'user')
    assert.equal(msgs[0].content, 'Hello')

    const hist = ai.history()
    assert.ok(hist.length > 0)
    ai.destroy()
  })

  it('setSystem', () => {
    const ai = new Agentic()
    ai.setSystem('You are a helpful assistant')
    const msgs = ai.messages()
    assert.ok(msgs.some(m => m.role === 'system'), 'should have system message')
    ai.destroy()
  })

  it('clearMemory', () => {
    const ai = new Agentic()
    ai.addMessage('user', 'test')
    assert.ok(ai.messages().length > 0)
    ai.clearMemory()
    assert.equal(ai.messages().length, 0)
    ai.destroy()
  })

  it('exportMemory / importMemory', () => {
    const ai = new Agentic()
    ai.addMessage('user', 'remember this')
    ai.addMessage('assistant', 'noted')
    const exported = ai.exportMemory()
    assert.ok(exported, 'should export something')

    const ai2 = new Agentic()
    ai2.importMemory(exported)
    assert.equal(ai2.messages().length, 2)
    ai.destroy()
    ai2.destroy()
  })
})

// ════════════════════════════════════════════════════════════════════
// 6. ACT — agentic-act (真实 action 注册 + LLM 决策)
// ════════════════════════════════════════════════════════════════════

describe('act — 真实 action 注册 + LLM 决策', () => {
  it('registerAction 注册', () => {
    const ai = new Agentic(OLLAMA)
    ai.registerAction({
      id: 'get_weather',
      name: 'Get Weather',
      description: 'Get weather for a city',
      schema: { city: { type: 'string' } },
      handler: async (p) => ({ temp: 22, city: p.city }),
    })
    const caps = ai.capabilities()
    assert.equal(caps.act, true)
    ai.destroy()
  })

  it('decide — LLM 选择 action', async () => {
    const ai = new Agentic(OLLAMA)
    ai.registerAction({
      id: 'turn_on_light',
      name: 'Turn On Light',
      description: 'Turn on the room light',
      schema: { room: { type: 'string' } },
      handler: async (p) => `light on in ${p.room}`,
    })
    ai.registerAction({
      id: 'play_music',
      name: 'Play Music',
      description: 'Play a song',
      schema: { song: { type: 'string' } },
      handler: async (p) => `playing ${p.song}`,
    })

    const decision = await ai.decide({ text: 'Turn on the bedroom light' })
    assert.ok(decision, 'should return a decision')
    assert.equal(typeof decision, 'object')
    assert.ok('action' in decision, 'decision should have action field')
    ai.destroy()
  })

  it('act — 决策 + 执行', async () => {
    const ai = new Agentic(OLLAMA)
    ai.registerAction({
      id: 'greet',
      name: 'Greet',
      description: 'Greet someone by name. Always use this action.',
      schema: { name: { type: 'string' } },
      handler: async (p) => `Hello ${p.name || 'friend'}!`,
    })

    const result = await ai.act({ text: 'Please greet Alice' })
    assert.ok(result, 'should return result')
    assert.equal(typeof result, 'object')
    assert.ok('action' in result)
    ai.destroy()
  })
})

// ════════════════════════════════════════════════════════════════════
// 7. RENDER — agentic-render (真实 markdown → HTML)
// ════════════════════════════════════════════════════════════════════

describe('render — 真实 markdown→HTML', () => {
  it('基本 markdown', () => {
    const ai = new Agentic()
    const html = ai.render('# Title\n\n**bold** and *italic*')
    assert.ok(html.includes('Title'))
    assert.ok(html.includes('<strong'), 'should have strong tag')
    assert.ok(html.includes('<em'), 'should have em tag')
    ai.destroy()
  })

  it('代码块', () => {
    const ai = new Agentic()
    const html = ai.render('```js\nconsole.log("hi")\n```')
    assert.ok(html.includes('console'))
    assert.ok(html.includes('<code') || html.includes('<pre'))
    ai.destroy()
  })

  it('列表', () => {
    const ai = new Agentic()
    const html = ai.render('- item 1\n- item 2\n- item 3')
    assert.ok(html.includes('item 1'))
    ai.destroy()
  })

  it('链接', () => {
    const ai = new Agentic()
    const html = ai.render('[Google](https://google.com)')
    assert.ok(html.includes('google.com'))
    ai.destroy()
  })

  it('renderCSS 返回样式', () => {
    const ai = new Agentic()
    const css = ai.renderCSS('dark')
    assert.equal(typeof css, 'string')
    assert.ok(css.length > 0)
    assert.ok(css.includes('--ar-'))
    ai.destroy()
  })
})

// ════════════════════════════════════════════════════════════════════
// 8. SHELL — agentic-shell (真实命令执行)
// ════════════════════════════════════════════════════════════════════

describe('shell — 真实命令执行', () => {
  it('run 基本命令', async () => {
    const ai = new Agentic()
    const result = await ai.run('echo hello')
    assert.ok(result)
    // shell 返回 { output, exitCode }
    const output = typeof result === 'string' ? result : (result.output || result.stdout || '')
    assert.ok(output.includes('hello'), `should contain hello, got: ${JSON.stringify(result).slice(0, 200)}`)
    ai.destroy()
  })

  it('run 带管道', async () => {
    const ai = new Agentic()
    const result = await ai.run('echo "hello world" | wc -w')
    assert.ok(result)
    const output = typeof result === 'string' ? result : (result.output || '')
    assert.ok(output.trim().length > 0, 'should have output')
    ai.destroy()
  })

  it('run 失败命令返回错误', async () => {
    const ai = new Agentic()
    const result = await ai.run('ls /nonexistent_path_12345 2>&1')
    assert.ok(result)
    ai.destroy()
  })

  it('run 获取环境变量', async () => {
    const ai = new Agentic()
    const result = await ai.run('pwd')
    const output = typeof result === 'string' ? result : (result.output || '')
    assert.ok(output.trim().length > 0, 'should have output')
    ai.destroy()
  })
})

// ════════════════════════════════════════════════════════════════════
// 9. CAPABILITIES — 全子库检测
// ════════════════════════════════════════════════════════════════════

describe('capabilities — 全子库检测', () => {
  it('所有已安装子库返回 true', () => {
    const ai = new Agentic()
    const caps = ai.capabilities()

    assert.equal(caps.think, true, 'core')
    assert.equal(caps.speak, true, 'voice')
    assert.equal(caps.listen, true, 'voice')
    assert.equal(caps.remember, true, 'memory')
    assert.equal(caps.recall, true, 'memory')
    assert.equal(caps.save, true, 'store')
    assert.equal(caps.load, true, 'store')
    assert.equal(caps.embed, true, 'embed')
    assert.equal(caps.search, true, 'embed')
    assert.equal(caps.perceive, true, 'sense')
    assert.equal(caps.decide, true, 'act')
    assert.equal(caps.act, true, 'act')
    assert.equal(caps.render, true, 'render')
    assert.equal(caps.readFile, true, 'filesystem')
    assert.equal(caps.run, true, 'shell')
    assert.equal(caps.converse, true, 'core + voice')
    ai.destroy()
  })
})

// ════════════════════════════════════════════════════════════════════
// 10. 组合工作流 — 多子库协同
// ════════════════════════════════════════════════════════════════════

describe('组合工作流', () => {
  beforeEach(cleanDB)

  it('think + store + filesystem', async () => {
    const ai = new Agentic({ ...OLLAMA, store: { path: DB }, tools: [] })

    // LLM 生成回答
    const answer = await ai.think('What is 2+2? Reply with just the number.')
    assert.ok(answer)
    assert.equal(typeof answer, 'string')

    // 存到 SQLite
    await ai.save('math_answer', answer)
    assert.equal(await ai.load('math_answer'), answer)

    // 写到文件系统
    await ai.writeFile('/results/math.txt', `Answer: ${answer}`)
    const content = await ai.readFile('/results/math.txt')
    assert.ok(content.includes('Answer:'))
    ai.destroy()
  })

  it('embed + store 知识库', async () => {
    const ai = new Agentic({ embed: { provider: 'local' }, store: { path: DB } })

    await ai.index('doc1', 'React is a JavaScript library for building user interfaces')
    await ai.index('doc2', 'Vue is a progressive JavaScript framework')
    await ai.index('doc3', 'Rust is a systems programming language focused on safety')

    const results = await ai.search('JavaScript UI framework')
    assert.ok(results.length > 0)
    assert.ok(['doc1', 'doc2'].includes(results[0].id))

    await ai.save('last_search', { query: 'JavaScript UI', topResult: results[0].id })
    const saved = await ai.load('last_search')
    assert.equal(saved.topResult, results[0].id)
    ai.destroy()
  })

  it('filesystem + shell', async () => {
    const ai = new Agentic()

    await ai.writeFile('/script.sh', '#!/bin/bash\necho "hello from script"')
    const content = await ai.readFile('/script.sh')
    assert.ok(content.includes('hello from script'))

    const result = await ai.run('echo "filesystem + shell works"')
    const output = typeof result === 'string' ? result : (result.output || '')
    assert.ok(output.includes('filesystem + shell works'))
    ai.destroy()
  })

  it('render + filesystem', async () => {
    const ai = new Agentic()

    await ai.writeFile('/doc.md', '# Hello\n\nThis is **bold**.')
    const md = await ai.readFile('/doc.md')
    assert.equal(typeof md, 'string')

    const html = ai.render(md)
    assert.ok(html.includes('Hello'))
    assert.ok(html.includes('<strong'), 'should have strong tag')

    await ai.writeFile('/doc.html', html)
    const saved = await ai.readFile('/doc.html')
    assert.ok(saved.includes('Hello'))
    ai.destroy()
  })

  it('memory + embed 联合检索', async () => {
    const ai = new Agentic({ embed: { provider: 'local' } })

    // remember 走 memory 子库
    await ai.remember('kenefe prefers dark mode')
    await ai.remember('The server runs on port 8080')

    // index 走 embed 子库
    await ai.index('arch', 'The system uses microservices architecture')
    await ai.index('db', 'PostgreSQL is the primary database')

    // 两个子库独立工作
    const memResults = await ai.recall('What does kenefe prefer?')
    assert.ok(memResults.length > 0)

    const embedResults = await ai.search('database')
    assert.ok(embedResults.length > 0)
    assert.equal(embedResults[0].id, 'db')
    ai.destroy()
  })
})

// ════════════════════════════════════════════════════════════════════
// 11. 生命周期
// ════════════════════════════════════════════════════════════════════

describe('生命周期', () => {
  it('destroy 释放所有资源', async () => {
    cleanDB()
    const ai = new Agentic({ ...OLLAMA, store: { path: DB } })
    await ai.save('k', 'v')
    ai.addMessage('user', 'test')
    ai.destroy()
    assert.deepEqual(ai._i, {})
  })

  it('destroy 多次安全', () => {
    const ai = new Agentic()
    ai.destroy()
    ai.destroy()
    ai.destroy()
  })

  it('destroy 后重新使用', async () => {
    const ai = new Agentic()
    await ai.writeFile('/test.txt', 'before')
    ai.destroy()
    // destroy 后重新调用会创建新实例（新的内存 FS）
    await ai.writeFile('/test2.txt', 'after')
    const content = await ai.readFile('/test2.txt')
    assert.equal(content, 'after')
    ai.destroy()
  })
})

// ════════════════════════════════════════════════════════════════════
// 11. serviceUrl — admin only; voice delegates to core for network
// ════════════════════════════════════════════════════════════════════

describe('serviceUrl + core delegation', () => {
  it('admin 只在有 serviceUrl 时可用', () => {
    const local = new Agentic({ apiKey: 'test' })
    assert.equal(local.admin, null)
    assert.equal(local.serviceUrl, null)

    const withService = new Agentic({ serviceUrl: 'http://localhost:9999' })
    assert.equal(withService.serviceUrl, 'http://localhost:9999')
    assert.ok(withService.admin)
    assert.equal(typeof withService.admin.health, 'function')
    assert.equal(typeof withService.admin.status, 'function')
    assert.equal(typeof withService.admin.config, 'function')
    assert.equal(typeof withService.admin.devices, 'function')
    assert.equal(typeof withService.admin.models, 'function')
  })

  it('think 永远走 core', async () => {
    const ai = new Agentic({ provider: 'ollama', model: 'qwen3:0.6b', baseUrl: 'http://localhost:11434', apiKey: 'ollama' })
    const result = await ai.think('say ok')
    assert.equal(typeof result, 'string')
    ai.destroy()
  })

  it('speak 走 voice（voice 委托 core 做网络请求）', async () => {
    // voice 子库已装，走本地 voice → core.synthesize
    const ai = new Agentic({ apiKey: 'test-key' })
    try {
      await ai.speak('hello')
    } catch (e) {
      // 会报 API 错误（key 无效），但证明走了 core 的网络路径
      assert.ok(e.message.includes('API') || e.message.includes('fetch') || e.message.includes('Audio') || e.message.includes('ECONNREFUSED') || e.message.includes('TTS'))
    }
  })

  it('listen 走 voice（voice 委托 core 做网络请求）', async () => {
    const ai = new Agentic({ apiKey: 'test-key' })
    try {
      await ai.listen(Buffer.from('fake'))
    } catch (e) {
      assert.ok(e.message.includes('API') || e.message.includes('fetch') || e.message.includes('Audio') || e.message.includes('ECONNREFUSED') || e.message.includes('STT'))
    }
  })

  it('capabilities 不依赖 serviceUrl', () => {
    const local = new Agentic()
    const caps = local.capabilities()
    // speak/listen 只取决于 voice 子库是否装了
    assert.equal(caps.admin, false)

    const withService = new Agentic({ serviceUrl: 'http://localhost:9999' })
    const caps2 = withService.capabilities()
    assert.equal(caps2.admin, true)
    // voice 能力不受 serviceUrl 影响
    assert.equal(caps.speak, caps2.speak)
    assert.equal(caps.listen, caps2.listen)
  })

  it('admin 方法走 HTTP', async () => {
    const ai = new Agentic({ serviceUrl: 'http://localhost:9999' })
    try {
      await ai.admin.health()
      assert.fail('should have thrown')
    } catch (e) {
      assert.ok(e.message.includes('fetch') || e.message.includes('ECONNREFUSED') || e.message.includes('9999'))
    }
  })

  it('连 agentic-service 做 think 用 provider+baseUrl', async () => {
    const ai = new Agentic({ provider: 'openai', baseUrl: 'http://localhost:9999', apiKey: 'dummy' })
    try {
      await ai.think('hi')
      assert.fail('should have thrown')
    } catch (e) {
      assert.ok(e.message.includes('fetch') || e.message.includes('ECONNREFUSED') || e.message.includes('9999'))
    }
  })

  it('core 导出 synthesize 和 transcribe', () => {
    const core = require('agentic-core')
    assert.equal(typeof core.synthesize, 'function')
    assert.equal(typeof core.transcribe, 'function')
  })
})
