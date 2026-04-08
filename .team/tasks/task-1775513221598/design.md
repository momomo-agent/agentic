# 技术设计: 服务端常驻唤醒词检测

## 文件修改
- `src/server/hub.js` — 添加 `startWakeWordDetection()`

## 函数签名
```js
export function startWakeWordDetection(keyword?: string): void
```

## 逻辑
```js
export function startWakeWordDetection(keyword = process.env.WAKE_WORD || 'hey agent') {
  if (!process.stdin.isTTY) return; // 非交互环境跳过

  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    if (chunk.toLowerCase().includes(keyword.toLowerCase())) {
      broadcast({ type: 'wake', keyword });
    }
  });
}

// broadcast 已存在于 hub.js，向所有 registry 中的 ws 发送消息
function broadcast(msg) {
  const data = JSON.stringify(msg);
  for (const { ws } of registry.values()) {
    if (ws.readyState === ws.OPEN) ws.send(data);
  }
}
```

## 集成点
- `src/server/api.js` 的 `startServer()` 中调用 `startWakeWordDetection()`
- 环境变量 `WAKE_WORD` 覆盖默认关键词

## 边界情况
- 非 TTY 环境（Docker、CI）自动跳过，不报错
- `registry` 为空时 broadcast 无操作
- 关键词匹配大小写不敏感

## 测试用例
- stdin 输入包含关键词 → broadcast 被调用，消息 `{ type: 'wake' }`
- stdin 输入不含关键词 → broadcast 不调用
- `WAKE_WORD=jarvis` → 使用自定义关键词
