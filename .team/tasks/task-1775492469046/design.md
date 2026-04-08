# Admin 管理面板 — 技术设计

## 文件清单

### 新建
- `src/ui/admin/index.html`
- `src/ui/admin/package.json`
- `src/ui/admin/vite.config.js`
- `src/ui/admin/src/main.js`
- `src/ui/admin/src/App.vue` — 三个 tab：硬件、配置、日志

### 修改
- `src/server/api.js` — 添加 `GET /api/logs` + `/admin` 静态文件服务

---

## GET /api/logs

```javascript
// src/server/api.js — 在 createApp() 外部维护内存缓冲
const logBuffer = [];
const _log = console.log;
console.log = (...args) => {
  logBuffer.push({ ts: Date.now(), msg: args.join(' ') });
  if (logBuffer.length > 200) logBuffer.shift();
  _log(...args);
};

// 在 createApp() 内
app.get('/api/logs', (req, res) => res.json(logBuffer.slice(-50)));
```

## /admin 静态服务

```javascript
// src/server/api.js — createApp() 内
const adminDist = new URL('../../dist/admin', import.meta.url).pathname;
app.use('/admin', express.static(adminDist));
app.get('/admin', (req, res) =>
  res.sendFile(path.join(adminDist, 'index.html'))
);
```

---

## Admin UI (src/ui/admin/)

**vite.config.js** — 端口 5174，proxy `/api` → `http://localhost:3000`，build outDir `../../../dist/admin`

**App.vue**

```javascript
// state
const tab = ref('hardware')   // 'hardware' | 'config' | 'logs'
const status = ref(null)      // from GET /api/status
const config = ref(null)      // from GET /api/config
const logs = ref([])          // from GET /api/logs

// onMounted: fetch all three in parallel
// logs tab: setInterval 5000ms to re-fetch /api/logs
```

展示内容：
- 硬件 tab: platform, arch, gpu.type, gpu.vram, memory, ollama.running/models
- 配置 tab: `<pre>{{ JSON.stringify(config, null, 2) }}</pre>`
- 日志 tab: 列表，每条 `ts`（格式化时间）+ `msg`

---

## 边界情况

- fetch 失败 → 显示错误占位文字，不崩溃
- dist/admin 不存在 → `/admin` 返回 404（开发用 vite dev）
- logBuffer 上限 200，API 返回最近 50

---

## 测试用例

- `GET /api/logs` 返回数组，每项含 `ts: number` 和 `msg: string`
- `GET /api/logs` 最多返回 50 条
- `/admin` 在 dist 存在时返回 200
