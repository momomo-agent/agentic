# M30: VAD + CDN真实端点 + HTTPS + 多设备脑状态共享

## 目标
解决剩余的vision/PRD gaps，提升产品完整度至90%+。

## 范围
1. VAD自动检测 — 替代纯push-to-talk，实现语音活动检测
2. CDN真实端点 — 替换profiles.js中的cdn.example.com占位符
3. HTTPS/LAN安全访问 — 多设备局域网安全连接
4. 多设备脑状态共享 — hub.js中跨设备AI上下文同步

## 验收标准
- VAD能自动检测语音开始/结束，无需手动按键
- profiles.js使用真实CDN URL或可配置环境变量
- HTTPS证书自动生成，LAN设备可安全访问
- 多设备会话共享LLM上下文（history同步）

## Gap来源
- PRD gap: VAD auto-detection (missing)
- PRD gap: CDN URL placeholder (partial)
- Vision gap: HTTPS/LAN tunneling (missing)
- Vision gap: multi-device brain state sharing (partial)
