# Live Talk

实时语音视觉对话 demo，复刻 [Parlor](https://github.com/fikrikarim/parlor) 的体验。

## 功能

- ✅ 实时语音对话（VAD 自动检测说话）
- ✅ 视觉输入（摄像头每次对话时抓帧）
- ✅ 流式 TTS（句子级播放）
- ✅ 打断机制（说话时自动停止 AI 回复）
- ✅ 文字输入（可选）

## 技术栈

- **前端**：
  - `agentic-sense` - VAD（语音活动检测）
  - `agentic-voice` - TTS 播放
  - 原生 Canvas API - 摄像头抓帧
- **后端**：
  - `apps/service` - `/api/chat` 接口
  - Ollama - Gemma 4 E2B（支持 vision + audio）

## 使用

### 1. 启动 agentic-service

```bash
cd ~/LOCAL/momo-agent/projects/agentic/apps/service
node bin/agentic-service.js
```

### 2. 下载 Gemma 4 E2B 模型

打开 http://localhost:1234，在"模型管理"中下载 `gemma4:e4b`（约 2.6GB）

### 3. 打开 live-talk

浏览器访问：http://localhost:1234/examples/live-talk/

### 4. 授权摄像头和麦克风

点击"开始对话"，授权后即可开始。

## 对比 Parlor

| 功能 | Parlor | Live Talk |
|------|--------|-----------|
| 实时语音 | ✅ Silero VAD | ✅ AgenticAudio VAD |
| 视觉输入 | ✅ 摄像头流 | ✅ 每次对话抓帧 |
| 打断 | ✅ | ✅ |
| 流式 TTS | ✅ 句子级 | ✅ 句子级 |
| 模型 | Gemma 4 E2B + Kokoro | Gemma 4 E2B + OpenAI TTS |
| 后端 | FastAPI + WebSocket | Express + SSE |
| 部署 | Python + uv | Node.js + npm |

## 架构

```
浏览器
  ├── AgenticAudio (VAD) → 检测说话
  ├── Canvas API → 抓摄像头帧
  └── AgenticVoice (TTS) → 播放回复
      │
      │ HTTP POST /api/chat
      ▼
agentic-service
  ├── brain.js → 调用 Ollama
  └── Ollama (gemma4:e4b) → 理解语音+视觉
```

## 注意事项

- Gemma 4 E2B 需要 ~3GB 内存
- 摄像头帧每次对话时抓取（不是实时流），节省带宽
- TTS 使用 OpenAI 兼容接口（可配置为 ElevenLabs）
- VAD 在浏览器端运行，无需服务器支持

## 开发

修改 `live-talk.js` 中的 `API_BASE` 可以连接到其他服务器。
