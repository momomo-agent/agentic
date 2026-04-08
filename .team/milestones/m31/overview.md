# M31: Detector层补全 + Runtime层全实现 (llm/stt/tts/sense/memory)

## 目标
完成 Detector 层（已done）并实现完整 Runtime 层所有模块。

## 范围
1. `src/detector/profiles.js` — getProfile(hardware) ✅
2. `src/detector/optimizer.js` — 硬件优化路径 ✅
3. `src/detector/gpu-detector.js` — 合并入 hardware.js ✅
4. `profiles/default.json` — cpu-only 默认 profile ✅
5. `src/runtime/llm.js` — chat(messages, options) → stream
6. `src/runtime/stt.js` — transcribe(audioBuffer) → text
7. `src/runtime/tts.js` — synthesize(text) → audioBuffer
8. `src/runtime/sense.js` — MediaPipe 感知运行时，支持服务端无头路径 (task-1775518460838)
9. `src/runtime/memory.js` — 持久化记忆 + 跨设备上下文共享 (task-1775518464754)

## 验收标准
- llm.js 支持 Ollama 本地 + 云端回退，流式输出
- stt.js 支持 SenseVoice/Whisper + 云端回退
- tts.js 支持 Kokoro/Piper + 云端回退
- sense.js 在无浏览器环境下可调用摄像头
- memory.js 持久化对话历史，支持跨设备读取

## Gap来源
- Architecture gap (missing): src/runtime/llm.js、stt.js、tts.js、sense.js、memory.js
