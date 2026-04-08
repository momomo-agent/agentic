# M19: CDN配置 + 性能验证 + 安全访问

## 目标
修复剩余的配置和验证缺口，确保生产就绪。

## 范围
1. 修复 profiles.js CDN URL（替换 cdn.example.com 占位符，确保 fallback 到 default.json）
2. 验证语音端到端延迟 <2s（STT+LLM+TTS 链路基准测试）
3. LAN HTTPS 访问支持（自签名证书或 mkcert 方案）

## 验收标准
- profiles.js 使用真实 CDN URL 或可配置环境变量，fallback 路径有测试覆盖
- 有延迟基准测试脚本，记录 STT/LLM/TTS 各阶段耗时
- 服务支持 HTTPS 启动选项（--https flag 或环境变量）
