# M40: Admin UI + Detector层补全 + 默认Profile

## 目标
完成Admin面板、Detector层补全和默认硬件配置。

## 任务
| Task | 描述 | Priority |
|------|------|----------|
| task-1775519693734 | src/ui/admin/ — 管理面板实现 | P0 |
| task-1775519693768 | profiles/default.json — 默认硬件配置 | P1 |
| task-1775519722018 | src/detector/profiles.js — getProfile(hardware)实现 | P1 |
| task-1775519726754 | src/detector/optimizer.js — 硬件优化路径补全 | P1 |

## 验收标准
- Admin UI 提供设备列表、配置编辑、状态监控
- profiles/default.json 覆盖 cpu-only 和 gpu 场景
- profiles.js 导出 getProfile(hardware)
- optimizer.js 覆盖完整硬件优化路径
