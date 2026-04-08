# M8: 唤醒词 + 视觉感知 + STT/TTS 自适应

## 目标
补全 PRD M2/M3 剩余缺口：唤醒词检测、agentic-sense 视觉感知、STT/TTS 硬件自适应选择。

## 范围
- 唤醒词检测（可配置，默认 "hey"）
- agentic-sense MediaPipe 视觉感知（人脸/手势/物体，浏览器端）
- STT/TTS 基于硬件 profile 的提供商自适应选择

## 验收标准
- 说出唤醒词后自动激活语音输入
- 浏览器端 MediaPipe 可检测人脸/手势/物体并发送事件
- STT/TTS 根据硬件 profile 自动选择本地或云端提供商
