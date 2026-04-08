# Task Design: hub.js 心跳超时60s

## 文件
- `src/server/hub.js`

## 现状分析
代码已正确实现：
- 设备状态检查（第13行）：`now - d.lastSeen > 60000`
- WebSocket ping 超时（第116行）：`now - device.lastPong > 60000`

## 结论
**无需修改**。DBB-006 验证条件已满足，超时已为 60000ms。

## 验证方式
- 设备连接后停止发送 pong
- 59s 时设备仍在 registry 中
- 60s 后设备被 `unregisterDevice` 移除
