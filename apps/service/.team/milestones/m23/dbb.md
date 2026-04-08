# M23 DBB — App.vue修复 + VAD + 测试覆盖率 + README

## 验收标准

### 1. App.vue 组件导入和状态轮询
- [ ] `src/ui/admin/App.vue` 正确导入 DeviceList、LogViewer、HardwarePanel
- [ ] `setInterval` 每5秒轮询 `GET /api/status`
- [ ] `:devices` 和 `:hardware` props 正确绑定
- [ ] 组件卸载时清除 interval

### 2. VAD 自动语音检测
- [ ] 检测到语音活动时自动开始录音
- [ ] 静音超过阈值时自动停止并发送
- [ ] 可与 push-to-talk 模式切换
- [ ] 权限拒绝时显示错误提示

### 3. 测试覆盖率 ≥ 98%
- [ ] `vitest.config.js` 配置 coverage threshold >= 98
- [ ] `POST /api/transcribe` 无效格式 → 400
- [ ] `PUT /api/config` 磁盘写失败 → 500
- [ ] `profiles.js` 空数组 → 返回 default profile
- [ ] SIGINT → `server.close()` 被调用
- [ ] `npm test` 全部通过，覆盖率 ≥ 98%

### 4. README.md
- [ ] 根目录存在 `README.md`
- [ ] 包含 npx / 全局安装 / Docker 三种方式
- [ ] 包含所有 API 端点文档
- [ ] 包含首次启动流程说明
