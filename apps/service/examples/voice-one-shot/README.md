# Voice One-Shot

展示 `/api/voice` 一体化接口的便利性。

## 功能

- ✅ 一次调用完成 STT → LLM → TTS
- ✅ 显示总耗时
- ✅ 直接返回音频
- ✅ 按住说话

## 使用

访问：http://localhost:1234/examples/voice-one-shot/

按住麦克风按钮说话，松开后自动处理并播放回复。

## 对比

| 方式 | 调用次数 | 延迟 |
|------|---------|------|
| Voice Assistant | 3次（STT + Chat + TTS） | 高 |
| Voice One-Shot | 1次（/api/voice） | 低 |

`/api/voice` 在服务端串联三个步骤，减少网络往返。
