# M28: VAD + HTTPS + CDN缓存 + Docker验收 + setup.sh完善

## 目标
补全剩余PRD/Vision gaps，确保产品可交付。

## 范围
- VAD自动语音检测集成到Web UI（push-to-talk + 自动模式）
- HTTPS/LAN隧道安全访问（多设备局域网）
- CDN profiles.json 7天缓存刷新机制
- Docker端到端构建验证
- setup.sh Node.js检测幂等性验证

## 验收标准
- VAD在Web UI中可用，自动检测语音开始/结束
- HTTPS访问localhost:3000可用
- profiles.js缓存超7天自动刷新
- docker-compose up端到端可运行
- setup.sh重复执行无副作用
