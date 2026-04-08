# 技术设计: 修复 EADDRINUSE 检测

## 问题根因
`app = express()` 在模块顶层创建单例，导致多次调用 `startServer()` 时复用同一 app 实例，端口冲突错误无法被正确捕获和传播。

## 文件
- `src/server/api.js` 或 `src/server/hub.js` — 重构为工厂函数

## 函数签名

```js
// src/server/hub.js (或 api.js)
function createApp(): express.Application
async function startServer(port?: number): Promise<http.Server>
async function stopServer(server: http.Server): Promise<void>
```

## 逻辑

```js
function createApp() {
  const app = express()
  app.use(express.json())
  // 挂载路由
  app.use('/api', router)
  return app
}

function startServer(port = 3000) {
  return new Promise((resolve, reject) => {
    const app = createApp()
    const server = app.listen(port)
    server.once('listening', () => resolve(server))
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error(`Port ${port} is already in use`))
      } else {
        reject(err)
      }
    })
  })
}

function stopServer(server) {
  return new Promise((resolve, reject) =>
    server.close(err => err ? reject(err) : resolve())
  )
}
```

在 CLI 入口 (`bin/agentic-service.js`) 中：
```js
startServer().catch(err => {
  console.error(err.message)
  process.exit(1)
})
```

## 边界情况
- 端口占用：`EADDRINUSE` → reject with 明确消息 → process.exit(1)
- 其他 listen 错误：透传 reject
- 测试中多次 startServer：每次创建新 app 实例，无状态泄漏

## 测试用例
- 启动两个服务器在同一端口 → 第二个 reject，消息含 "Port 3000 is already in use"
- stopServer 后再 startServer 同端口 → 成功
- startServer 返回的 server 可被 stopServer 关闭
