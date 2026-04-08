# STT 运行时 — 技术设计

## 文件
- 创建：`src/runtime/stt.js`
- 修改：`src/server/api.js`（接入 /api/transcribe）

## src/runtime/stt.js

```js
// 依赖：agentic-voice
let _provider = null

async function getProvider() {
  if (!_provider) {
    const { createSTT } = await import('agentic-voice')
    _provider = await createSTT()
  }
  return _provider
}

export async function transcribe(audioBuffer) {
  if (!audioBuffer || audioBuffer.length === 0) {
    throw Object.assign(new Error('empty audio'), { code: 'EMPTY_AUDIO' })
  }
  const provider = await getProvider()
  return provider.transcribe(audioBuffer)
}
```

## api.js 修改

```js
// POST /api/transcribe
// multer 解析 audio 字段（multipart/form-data）
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'audio required' })
  try {
    const text = await stt.transcribe(req.file.buffer)
    res.json({ text })
  } catch (e) {
    const status = e.code === 'EMPTY_AUDIO' ? 400 : 500
    res.status(status).json({ error: e.message })
  }
})
```

## 边界情况
- audioBuffer 为空 → 400
- agentic-voice 初始化失败 → 500，错误信息透传
- 不支持的音频格式 → agentic-voice 内部抛出，透传 500

## 测试用例
1. 正常音频 buffer → 返回转录文字
2. 空 buffer → 抛出 EMPTY_AUDIO 错误
3. mock agentic-voice 抛出 → 错误正确传播
4. POST /api/transcribe 无 file → 400
5. POST /api/transcribe 正常 → `{ text: "..." }`
