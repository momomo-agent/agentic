# Design: ui/admin 管理面板

## 文件
- `src/ui/admin/App.vue` — 主组件，含两个 tab
- `src/ui/admin/DeviceList.vue` — 设备列表
- `src/ui/admin/ConfigPanel.vue` — 配置读写

## 接口
```js
// DeviceList.vue
// GET /api/status → devices[]，每5s轮询
// 显示: id, status(online/offline), lastSeen

// ConfigPanel.vue
// GET /api/config 加载，PUT /api/config 保存
// 用 <textarea> 显示 JSON，保存前 JSON.parse 校验
```

## 边界情况
- PUT /api/config 失败：显示错误，不清空表单
- JSON 格式错误：阻止提交，提示用户

## 测试
- 设备列表每5s刷新
- 配置保存后重新 GET 返回新值
