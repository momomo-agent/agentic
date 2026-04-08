# M2: API 稳定性 + 配置持久化

## 目标
修复 M1 遗留的 stub 实现和已知 bug，使核心 API 达到可用状态。

## 范围
- 修复 `/api/status` 中 Ollama 字段为硬编码 stub 的问题
- 实现 `/api/config` GET/PUT 的持久化存储
- 修复 `EADDRINUSE` 检测（Express app singleton 导致端口冲突无法正确拒绝）

## 验收标准
- `/api/status` 返回真实 Ollama 运行状态（非 stub）
- `/api/config` PUT 后重启服务配置仍保留
- 端口冲突时服务启动失败并输出明确错误信息
