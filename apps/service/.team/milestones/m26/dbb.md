# M26 DBB - 架构对齐最终修复 + 验收

## DBB-001: hardware.js 包含 GPU 检测能力
- Requirement: task-1775514586151 (gpu-detector.js 合并到 hardware.js)
- Given: 调用 hardware.js 的硬件检测函数
- Expect: 返回结果包含 GPU 类型、显存信息（与原 gpu-detector.js 等价）
- Verify: 不存在独立的 gpu-detector.js 文件；hardware.js 导出 GPU 检测结果

## DBB-002: hardware.js 不依赖 gpu-detector.js
- Requirement: task-1775514586151
- Given: 检查项目文件结构
- Expect: src/detector/gpu-detector.js 不存在，或已被 hardware.js 完全替代
- Verify: 无任何文件 import/require gpu-detector.js

## DBB-003: profiles.js getProfile(hardware) 返回 Apple Silicon profile
- Requirement: task-1775514571886 (getProfile 实现验证)
- Given: 传入 `{ gpu: 'apple-silicon', memory: 16 }` 调用 getProfile
- Expect: 返回包含模型推荐的 profile 对象（非 null/undefined）
- Verify: profile 包含 llm.model 字段

## DBB-004: profiles.js getProfile(hardware) 返回 NVIDIA profile
- Requirement: task-1775514571886
- Given: 传入 `{ gpu: 'nvidia', vram: 8 }` 调用 getProfile
- Expect: 返回包含模型推荐的 profile 对象
- Verify: profile 包含 llm.model 字段

## DBB-005: profiles.js getProfile(hardware) 返回 cpu-only profile
- Requirement: task-1775514571886 (cpu-only profile 补充)
- Given: 传入 `{ gpu: null, memory: 8 }` 或 `{ gpu: 'none' }` 调用 getProfile
- Expect: 返回 cpu-only profile，推荐适合 CPU 运行的轻量模型
- Verify: profile 不为 null；llm.model 为 CPU 可运行的量化模型

## DBB-006: getProfile 对未知硬件不崩溃
- Requirement: task-1775514571886
- Given: 传入空对象 `{}` 或 `{ gpu: 'unknown' }` 调用 getProfile
- Expect: 返回默认 profile 或 cpu-only profile，不抛出异常
- Verify: 函数正常返回，exit code 0

## DBB-007: runtime/llm.js chat() 返回流式响应
- Requirement: task-1775514647990 (llm.js 实现)
- Given: Ollama 服务运行中，调用 `chat([{ role: 'user', content: 'hello' }])`
- Expect: 返回 AsyncIterable / stream，逐步产出 token
- Verify: 可用 for-await 迭代，收到至少一个非空 chunk

## DBB-008: runtime/llm.js chat() Ollama 不可用时报错
- Requirement: task-1775514647990
- Given: Ollama 服务未启动，调用 chat()
- Expect: 抛出明确错误（非静默失败），错误信息说明连接失败
- Verify: catch 到 Error 对象，message 非空

## DBB-009: Admin UI 路由可访问
- Requirement: task-1775514589838 (Admin UI 端到端验收)
- Given: 服务启动后，浏览器访问 /admin
- Expect: 返回 HTTP 200，页面包含管理面板内容（设备列表或配置项）
- Verify: 响应状态码 200，body 非空

## DBB-010: Docker 镜像构建成功
- Requirement: task-1775514589838
- Given: 在项目根目录执行 `docker build .`
- Expect: 构建成功，exit code 0，无 fatal error
- Verify: `docker images` 列出新镜像

## DBB-011: Docker 容器启动后服务可用
- Requirement: task-1775514589838
- Given: `docker run -p 3000:3000 <image>`
- Expect: HTTP GET /health 返回 200
- Verify: curl http://localhost:3000/health 响应正常

## DBB-012: setup.sh 一键安装不报错退出
- Requirement: task-1775514589838
- Given: 在干净环境执行 `bash setup.sh`
- Expect: 脚本执行完成，exit code 0，无 unhandled error
- Verify: 安装完成后服务可启动

## DBB-013: README 包含 npx 安装说明
- Requirement: task-1775514594768 (README 补全)
- Given: 阅读 README.md
- Expect: 包含 `npx agentic-service` 命令示例
- Verify: README.md 中存在 npx 相关章节

## DBB-014: README 包含 Docker 安装说明
- Requirement: task-1775514594768
- Given: 阅读 README.md
- Expect: 包含 docker/docker-compose 启动命令
- Verify: README.md 中存在 Docker 相关章节

## DBB-015: README 包含 REST API 文档
- Requirement: task-1775514594768
- Given: 阅读 README.md
- Expect: 至少记录 /chat 或 /api/chat 端点的请求/响应格式
- Verify: README.md 包含 API endpoint、请求体、响应体示例
