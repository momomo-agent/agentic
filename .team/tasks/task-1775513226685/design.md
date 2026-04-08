# 技术设计: npx入口完善 + CDN URL修正

## 文件修改
- `package.json` — 确认 bin 字段（已存在，无需改动）
- `src/detector/profiles.js` — 修正 CDN URL

## 当前状态
`package.json` 已有：
```json
"bin": { "agentic-service": "bin/agentic-service.js" }
```
`bin/agentic-service.js` 首行已有 `#!/usr/bin/env node`。
npx 入口已完善，无需修改。

## profiles.js 修改
```js
// 修改前（若存在 cdn.example.com）:
const PROFILES_URL = 'https://cdn.example.com/profiles.json';

// 修改后（已是正确形式，确认/修正为）:
const PROFILES_URL = process.env.PROFILES_URL ||
  'https://raw.githubusercontent.com/momomo/agentic-service/main/profiles/default.json';
```

当前 `profiles.js` 已使用此模式，需确认无 cdn.example.com 残留。

## 边界情况
- `PROFILES_URL` 环境变量优先，支持私有部署
- GitHub raw URL 为公开可访问的默认值
- 网络不可达时回退到本地缓存（已有逻辑）

## 测试用例
- `PROFILES_URL` 未设置 → 使用 GitHub raw URL
- `PROFILES_URL=http://custom/profiles.json` → 使用自定义 URL
- `npx agentic-service --help` → 正常输出帮助信息
