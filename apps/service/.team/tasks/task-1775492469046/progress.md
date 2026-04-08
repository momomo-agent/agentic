# Admin 管理面板

## Progress

- Created `src/ui/admin/` with index.html, package.json, vite.config.js, src/main.js, src/App.vue
- Updated `src/server/api.js`: GET /api/logs (logBuffer, max 50), /admin static file serving
- App.vue: three tabs (hardware/config/logs), parallel fetch on mount, 5s log polling
