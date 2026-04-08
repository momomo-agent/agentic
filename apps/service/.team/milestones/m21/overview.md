# M21: Detector完善 + Admin路由 + 架构对齐

## Goals
- 修复 src/detector/profiles.js — 实现 getProfile(hardware) 接口
- 修复 src/detector/optimizer.js — 对齐架构规范（或确认 matcher.js 替代）
- 完善 src/ui/client/ — 添加 /admin 路由，连接 Admin UI

## Acceptance Criteria
- getProfile(hardware) 返回匹配的 profile 配置
- optimizer.js 或 matcher.js 符合架构规范接口
- /admin 路由可访问管理面板
- architecture match 从 18% 提升至 ≥60%

## Scope
Targets remaining "missing/partial" architecture gaps after m20 completes.
Blocked until m20 tasks (hub/brain/api/admin) reach "done".
