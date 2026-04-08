# M8 DBB - 唤醒词 + 视觉感知 + STT/TTS 自适应

## DBB-001: 唤醒词触发语音激活
- Given: 用户说出配置的唤醒词（默认 "hey"）
- Expect: 语音输入自动激活，UI 显示监听状态
- Verify: wakeword 事件触发，VAD/录音开始

## DBB-002: 唤醒词可配置
- Given: PUT /api/config { wakeWord: "momo" }
- Expect: 重新加载后使用新唤醒词
- Verify: GET /api/config 返回 wakeWord: "momo"，检测生效

## DBB-003: 视觉感知人脸检测
- Given: 摄像头有人脸
- Expect: sense.js 发出 face_detected 事件，hub.js 广播
- Verify: WebSocket 收到 { type: "face_detected", data: { ... } }

## DBB-004: 视觉感知手势检测
- Given: 摄像头检测到手势
- Expect: sense.js 发出 gesture 事件
- Verify: WebSocket 收到 { type: "gesture", data: { gesture: string } }

## DBB-005: STT 本地优先
- Given: profile.stt.provider = "sensevoice"，本地服务可用
- Expect: transcribe() 使用本地 sensevoice
- Verify: 无 openai 请求，转录成功

## DBB-006: STT 云端 fallback
- Given: 本地 STT 不可用或 profile.stt.provider = "openai"
- Expect: transcribe() 自动切换到 openai whisper
- Verify: 转录成功，日志显示 fallback

## DBB-007: TTS 本地优先
- Given: profile.tts.provider = "kokoro"，本地服务可用
- Expect: synthesize() 使用本地 kokoro
- Verify: 返回音频，无 openai 请求

## DBB-008: TTS 云端 fallback
- Given: 本地 TTS 不可用
- Expect: synthesize() 切换到 openai tts
- Verify: 返回音频，日志显示 fallback
