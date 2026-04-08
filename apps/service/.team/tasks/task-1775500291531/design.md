# Design: server/hub.js 设备管理

## 文件
- `src/server/hub.js` — 新建

## 接口
```js
// Map<id, { id, meta, registeredAt, lastSeen, status }>
const devices = new Map()

export function registerDevice(id, meta)
// → { id, registeredAt: Date.toISOString() }

export function heartbeat(id)
// → void; 更新 lastSeen; 未知 id 自动注册

export function getDevices()
// → Array<{ id, meta, registeredAt, lastSeen, status: 'online'|'offline' }>
```

## 逻辑
- `setInterval` 每 10s 扫描：`Date.now() - lastSeen > 30000` → status = 'offline'
- heartbeat 将 status 置回 'online'

## 测试
- registerDevice 返回含 registeredAt
- 30s 无心跳后 getDevices 中该设备 status = 'offline'
- heartbeat 后 status = 'online'
