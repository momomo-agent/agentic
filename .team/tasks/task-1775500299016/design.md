# Design: server/api.js REST端点

## 文件
- `src/server/api.js` — 新建

## 路由
```js
// POST /api/chat — SSE stream
router.post('/chat', async (req, res) => {
  const { message, history = [] } = req.body
  res.setHeader('Content-Type', 'text/event-stream')
  for await (const chunk of chat([...history, { role: 'user', content: message }])) {
    res.write(`data: ${JSON.stringify(chunk)}\n\n`)
  }
  res.end()
})

// POST /api/transcribe
router.post('/transcribe', async (req, res) => {
  const text = await transcribe(req.body.audio)
  res.json({ text })
})

// POST /api/synthesize
router.post('/synthesize', async (req, res) => {
  const audio = await synthesize(req.body.text)
  res.set('Content-Type', 'audio/wav').send(audio)
})

// GET /api/status
router.get('/status', async (req, res) => {
  res.json({ hardware: await detect(), profile: await loadConfig(), devices: getDevices() })
})

// GET|PUT /api/config
router.get('/config', async (req, res) => res.json(await loadConfig()))
router.put('/config', async (req, res) => { await saveConfig(req.body); res.json({ ok: true }) })
```

## 边界情况
- chat body 缺 message → 400
- transcribe/synthesize 失败 → 500 + error message

## 测试
- POST /api/chat 返回 SSE，含 data: 行
- GET /api/status 返回含 hardware/profile/devices
- PUT /api/config 后 GET /api/config 返回新值
