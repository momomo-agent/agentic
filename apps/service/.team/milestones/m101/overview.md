# M101: 引擎层贯通 — brain/stt/tts 全部走 Engine Registry

## 目标

消除架构债务：所有能力路由统一走 engine/registry，不再直接读 config/profile。

## 背景

engine/registry.js 已搭好，但 brain.js / stt.js / tts.js 还在用旧路径（直接读 config.modelPool / hardware profile）。需要贯通。

## Features

### F1: brain.js 切到 Engine Registry
- `resolveModel()` 改为调用 `registry.resolveModel(modelId)`
- 删除 brain.js 内部的 `resolveModel` 函数和对 `getModelPool` 的依赖
- Ollama chat 和 Cloud chat 的路由逻辑移到对应 engine 的 `run()` 方法
- 保持 `/v1/chat/completions` 和 `/api/chat` 行为不变

### F2: stt.js 切到 Engine Registry
- 删除 stt.js 对 `detect()` / `getProfile()` 的直接调用
- 通过 assignments.stt 指向的模型 ID 找到对应引擎
- whisper engine 的 `run()` 方法封装适配器选择逻辑
- fallback 链：assignments 指定 → engine status check → 自动降级

### F3: tts.js 切到 Engine Registry
- 同 F2，删除对 hardware profile 的直接依赖
- tts engine 的 `run()` 方法封装适配器选择
- 支持通过 assignments.tts 切换 TTS 后端

### F4: 清理死文件
- 删除 `LocalModelsView.vue`、`CloudModelsView.vue`、`App-old.vue`、`ConfigPanel.vue`
- 删除 `runtime/memory.js`（未被引用）
- 清理 api.js 中的 `/api/ollama/*` 重复路由（保留 `/api/engines/*`）

### F5: API 路由统一
- `/api/model-pool` 改为代理到 `/api/engines/models`（兼容期）
- 新增 deprecation warning header
- 6 个月后移除旧路由

## 验收标准

- brain.js 不再 import config.js 的 getModelPool
- stt.js / tts.js 不再 import detector/
- 所有死文件已删除
- 现有 838 个测试全部通过
- `/v1/chat/completions` 行为不变（回归测试）
