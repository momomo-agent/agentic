# Design: 实现 src/detector/profiles.js

## 现状
`profiles.js` 已存在且实现完整：`getProfile(hardware)`、`loadProfiles()`、`fetchRemoteProfiles()`、`loadCache()`、`saveCache()`、`watchProfiles()`。

## 任务目标
验证并确保 `getProfile(hardware)` 完整覆盖所有硬件场景，依赖 `matcher.js` 的 `matchProfile()`。

## 文件
- `src/detector/profiles.js` — 已存在，检查并补全

## 接口
```js
// 主导出
export async function getProfile(hardware: HardwareInfo): Promise<ProfileConfig>
export function watchProfiles(hardware, onReload, interval?): () => void

// HardwareInfo
{ platform: string, arch: string, gpu: { type: string, vram: number }, memory: number }

// ProfileConfig
{ llm: { provider, model, quantization? }, stt: { provider, model }, tts: { provider, voice }, fallback: { provider, model } }
```

## 逻辑
1. `getProfile(hardware)` → `loadProfiles()` → `matchProfile(profiles, hardware)`
2. `loadProfiles()` 优先级：有效缓存 → 远程拉取+保存缓存 → 过期缓存 → 内置 `profiles/default.json`
3. 缓存路径：`~/.agentic-service/profiles.json`，TTL 7天
4. 远程 URL：`process.env.PROFILES_URL || 'https://raw.githubusercontent.com/momomo/agentic-service/main/profiles/default.json'`

## 边界情况
- 网络超时（5s AbortSignal）→ 降级缓存
- 缓存文件损坏 → catch 返回 null → 降级内置
- `matchProfile` 无匹配 → 抛出 `Error('No matching profile found')`

## 验证
- `getProfile({ platform:'darwin', arch:'arm64', gpu:{type:'apple-silicon',vram:16}, memory:16 })` 返回 gemma4:26b 配置
- `getProfile({ platform:'linux', gpu:{type:'none',vram:0}, memory:4 })` 返回 fallback 配置
- 网络断开时使用缓存或内置
