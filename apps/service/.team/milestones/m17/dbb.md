# M17 DBB - DBB修复 + 架构对齐 + 最终验收

## DBB-001: store.delete() 别名可调用
- Requirement: M17-scope (DBB M4修复)
- Given: 调用 store.delete(key) 删除一个已存在的键
- Expect: 操作成功，无报错，返回值表示删除成功
- Verify: 删除后调用 store.get(key) 返回 null 或 undefined

## DBB-002: store.delete() 不存在的键
- Requirement: M17-scope (DBB M4修复)
- Given: 调用 store.delete("nonexistent-key")
- Expect: 不抛出异常，优雅处理
- Verify: 调用不崩溃，返回值为 false 或 null

## DBB-003: brain.js tool_use 响应含 text 字段
- Requirement: M17-scope (DBB M9修复)
- Given: LLM 返回 tool_use 类型响应
- Expect: 响应对象中包含 text 字段（可为空字符串）
- Verify: 客户端收到的响应 JSON 中 text 字段存在且不为 undefined

## DBB-004: heartbeat 超时为 60s
- Requirement: M17-scope (DBB M7-005修复)
- Given: 设备连接后停止发送心跳
- Expect: 60 秒后设备被标记为离线/断开
- Verify: 在 40s 时设备仍在线；在 65s 时设备已离线

## DBB-005: heartbeat 正常续期
- Requirement: M17-scope (DBB M7-005修复)
- Given: 设备每 30s 发送一次心跳
- Expect: 设备持续保持在线状态，不被超时断开
- Verify: 运行 120s 后设备仍显示在线

## DBB-006: hub.js 广播 wakeword 事件
- Requirement: M17-scope (DBB wakeword修复)
- Given: 任意设备触发唤醒词检测
- Expect: hub 向所有已连接设备广播 wakeword 事件
- Verify: 连接的第二个设备收到 wakeword 事件消息

## DBB-007: wakeword 事件包含设备来源
- Requirement: M17-scope (DBB wakeword修复)
- Given: 设备 A 触发唤醒词
- Expect: 广播的 wakeword 事件包含来源设备 ID
- Verify: 事件消息中 deviceId 字段与触发设备匹配

## DBB-008: 架构对齐 CR 已提交
- Requirement: M17-scope (架构对齐)
- Given: M17 完成后检查 .team/change-requests/
- Expect: 存在针对 src/store/、src/cli/、src/runtime/embed.js 的 CR 文件
- Verify: CR 文件存在，type 为 requirement_clarification，内容描述架构偏差
