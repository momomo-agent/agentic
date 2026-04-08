# Design: 补全 src/detector/optimizer.js

## 现状
`src/detector/optimizer.js` 当前内容是 Ollama 安装逻辑（`setupOllama`、`detectOllama`、`pullModel` 等），与架构规范中 `optimizer.js` 的职责不符。

架构规范：
```js
// detector/optimizer.js — 硬件优化路径
// 应提供基于 profile 的运行时参数优化
```

`matcher.js` 负责 profile 匹配，`optimizer.js` 应负责在匹配后对运行参数做进一步调优。

## 文件
- `src/detector/optimizer.js` — 需重构（当前为 Ollama 安装逻辑）
- `src/detector/ollama.js` — Ollama 安装逻辑应迁移至此（若不存在则创建）

## 迁移步骤

1. 将 `optimizer.js` 中的 `setupOllama` 等函数迁移到 `src/detector/ollama.js`
2. 更新所有 `import { setupOllama } from './optimizer.js'` 为 `from './ollama.js'`
3. 重写 `optimizer.js` 为优化接口

## optimizer.js 新接口

```js
/**
 * 根据实际硬件对 profile 参数做运行时优化
 * @param {ProfileConfig} profile
 * @param {HardwareInfo} hardware
 * @returns {ProfileConfig} 优化后的 profile（不修改原对象）
 */
export function optimize(profile, hardware) {
  const result = structuredClone(profile)

  // Apple Silicon: 根据实际 vram 调整量化
  if (hardware.gpu?.type === 'apple-silicon') {
    if (hardware.gpu.vram >= 32) result.llm.quantization = 'q8'
    else if (hardware.gpu.vram >= 16) result.llm.quantization = 'q6'
    else result.llm.quantization = 'q4'
  }

  // 内存不足时降级模型
  if (hardware.memory < 8) {
    result.llm.model = result.llm.fallbackModel ?? result.llm.model
  }

  return result
}
```

## 边界情况
- `hardware.gpu` 为 undefined → 跳过 GPU 优化分支
- `profile` 字段缺失 → 使用 `??` 保持原值，不抛出
- 不修改传入的 profile 对象（使用 `structuredClone`）

## 依赖
- `ollama.js` 需先存在（或在本任务中创建）
- 调用方需从 `./ollama.js` 导入 `setupOllama`

## 测试用例
- `optimize(profile, { gpu:{type:'apple-silicon',vram:32}, memory:32 })` → `quantization='q8'`
- `optimize(profile, { gpu:{type:'apple-silicon',vram:8}, memory:8 })` → `quantization='q4'`
- `optimize(profile, { gpu:{type:'none',vram:0}, memory:4 })` → 降级模型
- 输入 profile 对象不被修改
