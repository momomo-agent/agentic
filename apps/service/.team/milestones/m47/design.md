# M47 Technical Design: Admin UI + optimizer.js + UI Route Completion

## Task 1: Admin panel (task-1775523890981)

**Files:** `src/ui/admin/index.html`, `src/ui/admin/App.vue`

- Single-page Vue 3 app with four sections: Hardware, Config, Devices, Logs
- Fetches from `/api/status` (hardware + devices) and `/api/config` on mount
- Logs section polls `GET /api/logs` or subscribes via WebSocket event `log`

## Task 2: Admin route in client UI (task-1775523895031)

**File:** `src/ui/client/App.vue` (or router config)

- Add `<router-link to="/admin">Admin</router-link>` in nav
- Vite config must proxy `/admin` to the admin app or serve it as a route
- Edge case: admin route must not break existing `/` chat route

## Task 3: optimizer.js (task-1775523899911)

**File:** `src/detector/optimizer.js`

```js
optimize(hardware) → {
  threads: number,       // cpu.cores - 1, min 1
  memoryLimit: string,   // e.g. "6gb"
  modelOverride: string|null  // force smaller model if low memory
}
```

- apple-silicon: threads = cores-1, memoryLimit = memory*0.75
- nvidia: threads = 4, memoryLimit based on vram
- cpu-only: threads = cores-1, memoryLimit = memory*0.5, modelOverride = 'gemma2:2b'

## Task 4: Merge gpu-detector.js (task-1775524560816)

**File:** `src/detector/hardware.js`

- Copy GPU detection logic from `gpu-detector.js` into `detect()` in `hardware.js`
- Delete `src/detector/gpu-detector.js`
- Update any imports pointing to `gpu-detector` to use `hardware.js`
