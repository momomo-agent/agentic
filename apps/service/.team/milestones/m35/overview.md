# M35: README + 一键安装 + 语音延迟基准 + CDN端点

## 目标
完成产品交付收尾：文档、安装体验、性能验证、CDN配置。

## 任务
| Task | 优先级 | 描述 |
|------|--------|------|
| task-1775519386021 | P1 | README.md — npx/Docker/API文档完善 |
| task-1775519393263 | P1 | 一键安装脚本 — curl-pipe setup.sh |
| task-1775519393298 | P1 | 语音延迟基准测试 — STT+LLM+TTS <2s验证 |
| task-1775519397626 | P1 | CDN真实端点配置验证 |

## 验收标准
- README包含npx一键启动、Docker部署、REST API文档
- setup.sh支持curl-pipe安装
- 端到端语音延迟<2s基准报告
- profiles.js CDN URL替换为真实端点，离线缓存回退正常

## 依赖
- M30 HTTPS + 多设备脑状态共享任务完成后激活
