# M23 Technical Design

## 1. App.vue 修复
- 文件: `src/ui/admin/App.vue`
- 在 `<script setup>` 中导入 DeviceList、LogViewer、HardwarePanel
- `onMounted` 启动 `setInterval(fetchStatus, 5000)`
- `onUnmounted` 调用 `clearInterval`
- `fetchStatus` → `GET /api/status` → 更新 `devices` / `hardware` ref

## 2. VAD 实现
- 文件: `src/ui/client/composables/useVAD.js`
- 使用 `AudioContext` + `AnalyserNode` 检测音量
- 接口: `useVAD({ onStart, onStop, threshold=0.01, silenceMs=1500 })`
- 在 `src/ui/client/App.vue` 中集成，提供 VAD/PTT 切换开关

## 3. 测试覆盖率
- 文件: `vitest.config.js` — 添加 `coverage.thresholds: { lines:98, functions:98, branches:98 }`
- 新增测试文件: `test/api.extra.test.js`
  - transcribe 无效格式 → 400
  - config 写磁盘失败 → 500
- 新增: `test/profiles.edge.test.js` — 空数组 → default profile
- 新增: `test/sigint.test.js` — SIGINT → server.close()

## 4. README.md
- 文件: `README.md`（项目根目录）
- 内容: 安装方式 × 3、API 端点表、首次启动流程
