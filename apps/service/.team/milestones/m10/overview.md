# M10: API 修复 + 硬件自适应 + 安装完善

## 目标
修复 M5 遗留的 API 不一致问题，完成硬件自适应模型选择，补全安装脚本。

## 范围
- sense.js: 添加 `detect(frame)` 同步接口，兼容 DBB 期望的调用方式
- memory.js: 修复并发写竞态，添加 mutex/锁保护 index 更新
- optimizer → llm.js: 将 loadConfig() 中硬编码的 gemma4:26b 替换为 optimizer 输出
- install/setup.sh: 补全一键安装脚本（curl | sh 入口）
- config 热更新: 远程 profiles 变更时触发配置重载

## 验收标准
- DBB-001~004: sense.detect(frame) 返回 {faces, gestures, objects}
- DBB-008: memory 并发写不丢数据
- DBB-013: 测试覆盖率 ≥ 98%
- optimizer 输出的模型名被 llm.js 实际使用
- `curl -fsSL https://get.example.com | sh` 可完成首次安装
