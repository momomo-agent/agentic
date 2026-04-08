# M26: 架构对齐最终修复 + 验收

## 目标
关闭剩余架构缺口，完成端到端验收。

## 任务范围
1. `profiles.js` getProfile(hardware) 实现验证 + cpu-only profile
2. `gpu-detector.js` 合并到 `hardware.js`（架构规范对齐）
3. Admin UI + Docker + setup.sh 端到端验收
4. README.md 补全（npx/global/Docker 安装 + API 文档）

## 验收标准
- architecture match ≥ 60%
- dbb match ≥ 90%
- prd match ≥ 90%
- 所有 P0/P1 架构缺口关闭
