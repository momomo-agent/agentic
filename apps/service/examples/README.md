# Examples

演示 agentic-service 的各种能力。启动服务后运行。

```bash
# 先启动服务
node bin/agentic-service.js
# 默认 http://localhost:1234
```

## 示例列表

| 文件 | 能力 | 说明 |
|------|------|------|
| `chat.js` | LLM 对话 | 流式聊天 + 多轮对话 |
| `hardware.js` | 硬件检测 | 自动检测 GPU/CPU/内存 |
| `voice.js` | 语音交互 | 录音 → STT → LLM → TTS 全链路 |
| `memory.js` | 向量记忆 | 存储/检索/语义搜索 |
| `devices.js` | 多设备 | WebSocket 注册 + 跨设备通信 |
| `tools.js` | 工具调用 | LLM + Function Calling |

## 运行

```bash
node examples/chat.js
node examples/hardware.js
node examples/voice.js
node examples/memory.js
node examples/devices.js
node examples/tools.js
```
