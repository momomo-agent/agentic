# M29: Ollama安装 + 服务端感知 + 语音延迟 + README

## Goals
- Ollama自动安装二进制 + 拉取推荐模型
- setup.sh完善：curl-pipe安装 + npx入口验证
- 服务端唤醒词常驻pipeline集成
- 语音延迟<2s端到端基准验证
- README用户文档补全

## Acceptance Criteria
- `setup.sh` 可通过 `curl | bash` 一键安装，npx入口可用
- Ollama binary自动检测安装，模型自动拉取
- 服务端wake word pipeline在server启动时激活
- STT+LLM+TTS端到端延迟测试 ≤2000ms
- README包含安装/API/Docker完整文档
