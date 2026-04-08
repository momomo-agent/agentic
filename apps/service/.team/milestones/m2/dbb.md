# M2 Done-By-Definition (DBB)

## 验收标准

### 1. /api/status Ollama 真实检测
- [ ] `GET /api/status` 返回的 `ollama.running` 反映真实进程状态（非硬编码）
- [ ] Ollama 未运行时 `ollama.running = false`
- [ ] Ollama 运行时 `ollama.running = true` 且 `ollama.models` 为真实模型列表
- [ ] HTTP ping 超时（>2s）视为未运行，不抛出异常

### 2. /api/config 持久化
- [ ] `GET /api/config` 返回上次 PUT 保存的配置（重启后仍有效）
- [ ] `PUT /api/config` 将配置写入磁盘（JSON 文件）
- [ ] 首次启动无配置文件时返回空对象 `{}`
- [ ] 写入失败返回 500，不静默丢失数据

### 3. EADDRINUSE 检测
- [ ] 端口被占用时 `startServer()` reject，错误消息含 `Port X is already in use`
- [ ] 多次调用 `startServer()` 不因模块级单例导致端口冲突
- [ ] 测试可独立启动/关闭服务器实例，无状态泄漏
