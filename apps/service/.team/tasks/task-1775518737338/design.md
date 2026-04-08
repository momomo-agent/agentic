# Design: 合并 gpu-detector.js 到 hardware.js

## 现状
`src/detector/hardware.js` 已包含完整 GPU 检测逻辑（`detectGPU`、`detectMacGPU`、`detectLinuxGPU`、`detectWindowsGPU`）。
架构规范只有 `hardware.js`，无 `gpu-detector.js`。

## 任务
检查是否存在独立的 `gpu-detector.js`，若存在则合并逻辑后删除。

## 步骤

1. 检查 `src/detector/gpu-detector.js` 是否存在
2. 若存在：对比与 `hardware.js` 中 GPU 检测逻辑的差异
3. 将 `gpu-detector.js` 中未覆盖的逻辑合并入 `hardware.js` 的 `detectGPU()` 函数
4. 更新所有 `import ... from './gpu-detector.js'` 为从 `hardware.js` 导入
5. 删除 `src/detector/gpu-detector.js`

## 若 gpu-detector.js 不存在
任务已完成（架构已符合规范），标记 hasDesign=true 并关闭。

## 文件
- `src/detector/hardware.js` — 可能需要补充 GPU 检测逻辑
- `src/detector/gpu-detector.js` — 若存在则删除

## 边界情况
- 合并时保持 `detect()` 返回签名不变：`{ type, vram }`
- 不改变 `hardware.js` 的导出接口

## 测试用例
- `detect()` 返回包含 `gpu.type` 和 `gpu.vram` 的对象
- 删除 `gpu-detector.js` 后无 import 报错
