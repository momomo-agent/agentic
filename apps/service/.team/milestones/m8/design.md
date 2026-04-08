# M8 Technical Design: 唤醒词 + 视觉感知 + STT/TTS 自适应

## 1. 唤醒词检测 (src/ui/client/WakeWord.vue)

浏览器端持续监听麦克风，使用 Web Speech API SpeechRecognition 做关键词匹配：
- `startListening()` — 启动后台识别，interimResults: true
- 匹配到 wakeWord（从 /api/config 读取）→ emit('activated')
- WakeWord.vue 挂载到 App.vue，激活后触发 PushToTalk 录音流程

配置存储：wakeWord 字段写入 config.json，通过 PUT /api/config 更新。

## 2. 视觉感知 (src/runtime/sense.js)

封装 agentic-sense（MediaPipe），浏览器端运行：
```
init(videoElement) → void          // 初始化 MediaPipe pipeline
on(eventType, handler) → void      // 订阅感知事件
start() → void                     // 开始帧处理循环
stop() → void                      // 停止
```
事件格式：`{ type: 'face_detected'|'gesture_detected'|'object_detected', data: {...}, ts: number }`

感知事件通过 WebSocket 发送至 server/hub.js，hub 广播给订阅设备。

## 3. STT/TTS 自适应 (src/runtime/stt.js, src/runtime/tts.js)

启动时从 detector/profiles.js 读取当前 profile，按 provider 字段选择适配器：

**stt.js**
```
transcribe(audioBuffer: Buffer) → Promise<string>
```
- profile.stt.provider === 'sensevoice' → agentic-voice SenseVoice 适配器
- profile.stt.provider === 'whisper' → agentic-voice Whisper 适配器  
- 其他 → agentic-voice OpenAI Whisper API 适配器

**tts.js**
```
synthesize(text: string) → Promise<Buffer>
```
- profile.tts.provider === 'kokoro' → agentic-voice Kokoro 适配器
- profile.tts.provider === 'piper' → agentic-voice Piper 适配器
- 其他 → agentic-voice OpenAI TTS 适配器

适配器选择在模块初始化时完成，运行时不重复判断。

## 依赖
- sense.js → agentic-sense（已在 ARCHITECTURE.md 中定义）
- stt.js / tts.js → agentic-voice
- WakeWord.vue → /api/config (GET wakeWord)
