# M19 Technical Design: CDN配置 + 性能验证 + 安全访问

## 涉及文件
- `src/detector/profiles.js` — 替换硬编码 CDN URL，支持 `PROFILES_URL` 环境变量
- `scripts/benchmark.js` — 新增延迟基准测试脚本
- `src/server/https.js` — 证书生成 helper（mkcert 优先，fallback selfsigned）
- `bin/agentic-service.js` — 解析 `--https` flag
- `src/server/api.js` — 支持 HTTPS 服务器

## 关键决策
- CDN URL 通过 `process.env.PROFILES_URL` 覆盖，默认指向真实地址（非占位符）
- 基准测试直接调用 runtime 模块，不依赖服务启动，total ≥ 2000ms 时 exit(1)
- HTTPS 证书持久化到 `~/.agentic/certs/`，避免每次重新生成
