# M21 DBB - Detector完善 + Admin路由 + 架构对齐

## DBB-001: profiles.js getProfile 返回正确配置
- Given: `hardware = { platform:'darwin', arch:'arm64', gpu:{ type:'apple-silicon' }, memory:16 }`
- Expect: `getProfile(hardware)` 返回含 `llm`, `stt`, `tts`, `fallback` 字段的对象
- Verify: unit test

## DBB-002: profiles.js 离线回退
- Given: 网络不可用，无缓存
- Expect: `getProfile(hardware)` 返回内置 default profile，不抛出异常
- Verify: unit test (mock fetch to throw)

## DBB-003: optimizer.js 导出 setupOllama
- Given: `import { setupOllama } from './optimizer.js'`
- Expect: 函数存在且接受 `profile` 参数
- Verify: `node -e "import('./src/detector/optimizer.js').then(m => console.log(typeof m.setupOllama))"`

## DBB-004: /admin 路由可访问
- Given: 服务启动，访问 `http://localhost:3000/admin`
- Expect: 返回 Admin UI HTML 页面（非 404）
- Verify: `curl -s http://localhost:3000/admin | grep -i admin`

## DBB-005: client 路由切换正常
- Given: 访问 `/` 显示对话界面，访问 `/admin` 显示管理面板
- Expect: 两个路由均正常渲染，无 JS 错误
- Verify: browser navigation
