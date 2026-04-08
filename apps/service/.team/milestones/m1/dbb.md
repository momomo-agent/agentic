# M1: 硬件检测 + 一键启动 - DBB (验收标准)

## 功能验收

### 1. 硬件检测
- [ ] 运行 `node src/detector/hardware.js` 输出正确的 JSON 格式
- [ ] JSON 包含所有必需字段：platform, arch, gpu.type, gpu.vram, memory, cpu.cores, cpu.model
- [ ] M4 Mac mini 检测结果：platform=darwin, arch=arm64, gpu.type=apple-silicon
- [ ] Linux + NVIDIA 检测结果：gpu.type=nvidia, gpu.vram 正确（通过 nvidia-smi）
- [ ] 无 GPU 设备检测结果：gpu.type=none, gpu.vram=0

### 2. 远程配置
- [ ] 首次运行时从 CDN 拉取 profiles.json（URL: https://cdn.example.com/agentic-service/profiles.json）
- [ ] profiles.json 缓存到 ~/.agentic-service/profiles.json
- [ ] 离线模式下使用本地缓存（网络失败时不报错）
- [ ] 缓存超过 7 天时尝试更新（静默失败）
- [ ] getProfile(hardware) 返回匹配的配置（llm, stt, tts, fallback）

### 3. Ollama 集成
- [ ] 检测 Ollama 是否已安装（which ollama）
- [ ] 未安装时提示用户安装（显示安装命令）
- [ ] 已安装时检查推荐模型是否存在（ollama list）
- [ ] 模型不存在时自动拉取（ollama pull gemma4:26b）
- [ ] 显示下载进度（百分比 + 速度）
- [ ] 下载失败时显示清晰错误信息

### 4. HTTP 服务
- [ ] 启动服务监听 http://localhost:3000
- [ ] POST /api/chat 接受 { message, history } 返回 streaming response
- [ ] 响应格式：Server-Sent Events (SSE)，每个 chunk 是 JSON
- [ ] GET /api/status 返回 { hardware, profile, ollama: { installed, models } }
- [ ] 服务启动 < 3 秒（已安装模型的情况）

### 5. Web UI
- [ ] 访问 http://localhost:3000 显示对话界面
- [ ] 输入框可输入文本，按 Enter 发送
- [ ] 消息显示在对话区（用户消息右对齐，AI 消息左对齐）
- [ ] AI 回复支持流式显示（逐字出现）
- [ ] 界面响应式（手机/平板/桌面）

### 6. CLI 入口
- [ ] npx agentic-service 能启动服务
- [ ] 首次启动显示硬件检测结果
- [ ] 首次启动显示推荐配置
- [ ] 首次启动检查 Ollama 并提示安装
- [ ] 服务启动后自动打开浏览器（http://localhost:3000）
- [ ] Ctrl+C 优雅关闭服务

## 性能验收

- [ ] 首次安装（含模型下载）< 10 分钟（M4 Mac mini + 100Mbps 网络）
- [ ] 非首次启动 < 10 秒（从命令到浏览器打开）
- [ ] 文本对话响应延迟 < 2 秒（首 token）
- [ ] 内存占用 < 500MB（不含 Ollama）

## 错误处理验收

- [ ] 端口 3000 被占用时显示错误并退出
- [ ] Ollama 未安装时不崩溃，显示安装指引
- [ ] 网络失败时使用本地缓存 profiles
- [ ] 模型下载失败时显示错误并允许重试
- [ ] LLM 推理失败时返回错误消息（不崩溃）

## 兼容性验收

- [ ] macOS (Apple Silicon) - M1/M2/M3/M4
- [ ] macOS (Intel)
- [ ] Linux (x64) - Ubuntu 22.04+
- [ ] Node.js 18+ / 20+ / 22+
