# M17: DBB修复 + 架构对齐 + 最终验收

## 目标
修复DBB中仍标记为partial/missing的关键问题，提升PRD/DBB/架构匹配度。

## 范围
- store.js补充delete()别名（DBB M4要求）
- brain.js tool_use响应补充text字段（DBB M9要求）
- heartbeat超时从40s修正为60s（DBB M7-005要求）
- hub.js广播wakeword事件（DBB要求）
- 架构对齐：src/store/、src/cli/、src/runtime/embed.js提交CR

## 验收标准
- store.delete() 可调用
- brain.js tool_use响应含text字段
- heartbeat 60s超时
- hub.js广播wakeword事件
- CR提交至.team/change-requests/
