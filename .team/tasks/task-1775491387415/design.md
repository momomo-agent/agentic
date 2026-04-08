# 技术设计: 修复 /api/status Ollama 真实检测

## 文件
- `src/server/api.js` — 修改 `/api/status` 路由处理函数

## 函数签名

```js
// src/server/api.js
async function getOllamaStatus(): Promise<{ running: boolean, models: string[] }>
```

## 逻辑

```js
async function getOllamaStatus() {
  try {
    const res = await fetch('http://localhost:11434/api/tags', {
      signal: AbortSignal.timeout(2000)
    })
    if (!res.ok) return { running: false, models: [] }
    const { models } = await res.json()
    return { running: true, models: models.map(m => m.name) }
  } catch {
    return { running: false, models: [] }
  }
}
```

在 `GET /api/status` 中替换硬编码 stub：
```js
router.get('/status', async (req, res) => {
  const ollama = await getOllamaStatus()
  res.json({ hardware, profile, ollama })
})
```

## 边界情况
- Ollama 未安装/未运行：fetch 抛出 → catch 返回 `{ running: false, models: [] }`
- 超时（>2s）：AbortSignal 触发 → 同上
- `/api/tags` 返回非 200：返回 `{ running: false, models: [] }`

## 测试用例
- mock fetch 返回正常响应 → `running: true`, models 列表正确
- mock fetch 抛出 ECONNREFUSED → `running: false`, models 为空
- mock fetch 超时 → `running: false`, models 为空
