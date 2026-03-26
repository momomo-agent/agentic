# Agentic Family Convention

## 命名

- 仓库名：`agentic-xxx`
- 核心文件名：`agentic-xxx.js`（跟仓库名一致，不用缩写）
- 全局变量名：`AgenticXxx`（PascalCase）

## 模块格式：UMD

所有库必须是 UMD 格式，一个文件三种环境都能跑：

```js
// Node
const { AgenticSense } = require('agentic-sense')

// Browser <script>
<script src="agentic-sense.js"></script>

// ESM
import { AgenticSense } from './agentic-sense.js'
```

### UMD wrapper 模板

单 class 导出：
```js
;(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory()
  else if (typeof define === 'function' && define.amd) define(factory)
  else root.AgenticXxx = factory()
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this, function() {
  'use strict'

  // ... 代码 ...

  return { ClassName, helperFn }
})
```

多导出（挂到全局）：
```js
else { var e = factory(); for (var k in e) root[k] = e[k] }
```

## 零依赖

- 运行时零 npm 依赖
- 外部资源（模型、WASM）在运行时按需加载
- 单文件即库，不需要构建步骤

## package.json

```json
{
  "name": "agentic-xxx",
  "main": "agentic-xxx.js",
  "browser": "agentic-xxx.js",
  "files": ["agentic-xxx.js", "README.md"]
}
```

不要设 `"type": "module"`（UMD 不是纯 ESM）。

## 目录结构

```
agentic-xxx/
  agentic-xxx.js    ← 核心库（唯一必需文件）
  package.json
  README.md
  demo/             ← 示例（可选）
  server/           ← 配套服务（可选，如 local-agentic-sense）
```

## README 结构

1. 一句话描述
2. Quick Start（三种引入方式）
3. API
4. Features 列表
5. "Part of the agentic.js family" + 链接

## 版本

语义化版本。0.x.x 阶段 API 可能变。

## 家族成员

| 库 | 职责 |
|---|---|
| agentic-core | LLM 调用、工具、schema、流式 |
| agentic-sense | 视觉感知（面部/手势/姿态/物体）+ 语音 |
| agentic-render | AI 输出渲染（markdown/代码/工具调用） |
| agentic-memory | 知识存储与检索 |
| agentic-embed | 嵌入向量（已合并入 memory） |
| agentic-store | 持久化状态管理 |
| agentic-voice | 语音合成与识别 |
| agentic-claw | Agent 运行时（skill 系统） |
| agentic-act | 浏览器自动化 |
