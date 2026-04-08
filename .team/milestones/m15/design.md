# M15 Technical Design — DBB修复 + sense.js兼容 + 唤醒词广播

## 范围

5个独立的小修复，无相互依赖：

1. **sense.js** — 用 `setInterval` 替换 `requestAnimationFrame`，使其在 Node.js 可运行
2. **store/index.js** — 导出 `delete` 作为 `del` 的别名
3. **hub.js** — wakeword 事件触发 `broadcastWakeword()`（已存在，确认路径正确）
4. **hub.js** — 心跳超时确认为 60000ms（已正确，无需改动）
5. **brain.js** — tool_use 响应已含 `text: ''`（已正确，无需改动）

## 分析结论

- DBB-005/006/007 对应的代码已经正确实现，只需验证
- 真正需要修改的是 task-1775507803330（sense.js）和 task-1775507813507（store.js）
- task-1775507813540/818493/818526 为验证性任务

## 文件变更

| 文件 | 变更类型 |
|------|---------|
| `src/runtime/sense.js` | 修改：`requestAnimationFrame` → `setInterval` |
| `src/store/index.js` | 修改：导出 `delete` 别名 |
