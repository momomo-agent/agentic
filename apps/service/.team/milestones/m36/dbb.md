# M36 DBB - README + 语音延迟基准 + Headless Camera

## DBB-001: README 存在且包含安装说明
- Requirement: README.md (npx/Docker/API文档)
- Given: 项目根目录
- Expect: README.md 存在，包含 `npx agentic-service`、Docker、全局安装三种方式的说明
- Verify: `cat README.md` 包含 "npx"、"docker" 关键词

## DBB-002: README 包含 REST API 文档
- Requirement: README.md (npx/Docker/API文档)
- Given: README.md
- Expect: 至少列出一个 REST API 端点（路径、方法、请求/响应示例）
- Verify: README.md 中可见 HTTP 方法（GET/POST）和路径

## DBB-003: 语音延迟 P95 < 2s
- Requirement: 语音延迟基准测试 <2s
- Given: 本地服务运行，发送语音输入
- Expect: STT + LLM + TTS 全链路端到端延迟 P95 < 2000ms
- Verify: 基准测试脚本输出 P95 延迟数值 < 2000

## DBB-004: 语音延迟基准测试可执行
- Requirement: 语音延迟基准测试 <2s
- Given: 项目根目录
- Expect: 存在可运行的基准测试脚本或 npm script
- Verify: 运行后输出延迟统计数据（P50/P95 或均值）

## DBB-005: sense.js 支持服务端无浏览器摄像头路径
- Requirement: sense.js headless camera 服务端路径
- Given: 在无浏览器环境（Node.js 进程）中调用 sense.js 摄像头功能
- Expect: 不抛出 "videoElement is not defined" 或类似浏览器 API 缺失错误
- Verify: 服务端启动后 sense 模块可初始化，日志无 videoElement 相关错误

## DBB-006: Headless camera 路径与浏览器路径互不干扰
- Requirement: sense.js headless camera 服务端路径
- Given: 浏览器客户端连接时
- Expect: 浏览器端感知功能正常，服务端 headless 路径不影响客户端行为
- Verify: 浏览器端摄像头/感知功能可正常使用
