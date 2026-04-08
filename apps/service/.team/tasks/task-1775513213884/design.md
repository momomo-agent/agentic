# 技术设计: HTTPS/LAN安全访问接入

## 文件修改
- `src/server/api.js` — 修改 `startServer()`

## 函数签名
```js
// 现有签名不变，扩展返回值
export async function startServer(port: number, options?: { https?: boolean }): Promise<http.Server | { http: http.Server, https: https.Server }>
```

## 逻辑
```js
import { createServer as createHttpsServer } from './httpsServer.js';

export async function startServer(port, options = {}) {
  const app = createApp(); // 现有 express app 创建逻辑
  const httpServer = http.createServer(app);
  initWebSocket(httpServer);
  httpServer.listen(port);

  if (options.https) {
    const httpsPort = port + 443; // 3000 → 3443
    const httpsServer = createHttpsServer(app);
    httpsServer.listen(httpsPort);
    return { http: httpServer, https: httpsServer };
  }
  return httpServer;
}
```

## 边界情况
- `httpsServer.js` 的 `createServer(app)` 已存在，直接复用
- `bin/agentic-service.js` 已处理 `--https` flag，`server.close()` 需兼容两种返回值：
  ```js
  // bin/agentic-service.js shutdown()
  if (server.http) { server.http.close(); server.https.close(); }
  else { server.close(); }
  ```
- HTTPS 端口固定为 `port + 443`，无需额外配置

## 测试用例
- `startServer(3000, { https: true })` 返回 `{ http, https }` 对象
- `startServer(3000)` 返回单个 http.Server
- HTTPS 服务器监听 3443
