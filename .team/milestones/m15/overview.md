# M15: DBB修复 + sense.js兼容 + 唤醒词广播

## 目标
修复剩余DBB规范不一致问题，提升系统稳定性和规范符合度。

## 范围
1. sense.js Node.js兼容 — 移除requestAnimationFrame，改用setInterval/process.nextTick
2. store.delete()别名 — store.js导出delete()方法（别名del()）
3. hub.js唤醒词广播 — 收到wakeword事件时广播给所有设备
4. heartbeat超时修复 — 设备心跳超时从40s改为60s（符合M7 DBB-005）
5. tool_use响应text字段 — brain.js的tool_use响应补充text字段（符合M9 DBB）

## 验收标准
- sense.js在Node.js环境可运行，无requestAnimationFrame报错
- store.delete(key)与store.del(key)均可用
- hub.js收到wakeword时广播wakeword事件给所有连接设备
- 心跳超时为60000ms
- brain.js tool_use响应包含text字段
