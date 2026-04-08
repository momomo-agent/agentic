# TTS 运行时 — 技术设计

## 文件
- 创建：`src/runtime/tts.js`
- 修改：`src/server/api.js`（接入 /api/synthesize）

## src/runtime/tts.js

```js
let _provider = null

async function getProvider() {
  if (!_provider) {
    const { createTTS } = await import('agentic-voice')
    _provider = await createTTS()
  }
  return _provider
}

export async function synthesize(text) {
  if (!text || !text.trim()) {
    throw Object.assign(new Error('text required'), { code: 'EMPTY_TEXT' })
  }
  const provider = await getProvider()
  return provider.synthesize(text)  // → Buffer (wav)
}
```

## api.js 修改

```js
// POST /api/synthesize  body: { text: string }
router.post('/synthesize', async (req, res) => {
  const { text } = req.body
  if (!text) return res.status(400).json({ error: 'text required' })
  try {
    const audio = await tts.synthesize(text)
    res.set('Content-Type', 'audio/wav').send(audio)
  } catch (e) {
    const status = e.code === 'EMPTY_TEXT' ? 400 : 500
    res.status(status).json({ error: e.message })
  }
})
```

## 边界情况
- text 为空/空白 → 400
- agentic-voice 初始化失败 → 500

## 测试用例
1. 正常文字 → 返回 Buffer
2. 空字符串 → 抛出 EMPTY_TEXT
3. mock provider 抛出 → 错误传播
4. POST /api/synthesize 无 text → 400
5. POST /api/synthesize 正常 → Content-Type: audio/wav
