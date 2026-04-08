# M2: API 稳定性 + 配置持久化 - 技术设计

## 目标
修复 M1 遗留的三个问题：Ollama stub、config 无持久化、EADDRINUSE 无法检测。

## 涉及文件
- `src/server/api.js` — 修改 /api/status 和 /api/config 路由
- `src/server/hub.js` 或 `bin/agentic-service.js` — 修复 Express 单例问题

## 技术方案

### 1. Ollama 真实检测
在 `/api/status` 处理函数中替换 stub：
- 进程检查：`pgrep ollama` 或 `ps aux | grep ollama`
- HTTP ping：`fetch('http://localhost:11434', { signal: AbortSignal.timeout(500) })`
- 模型列表：`fetch('http://localhost:11434/api/tags')`

### 2. config 持久化
- 存储路径：`~/.agentic-service/config.json`
- GET：读文件，不存在返回默认值
- PUT：写文件（`fs.writeFile` atomic via tmp + rename）

### 3. EADDRINUSE 修复
- 将 `app = express()` 移入工厂函数，避免模块级单例
- `server.listen` 错误监听 `error` 事件，捕获 `EADDRINUSE` 输出明确信息后 `process.exit(1)`
