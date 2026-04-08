# Architecture

## 包依赖关系

```
agentic-lite
├── agentic-core  (file:../agentic-core)  ← LLM loop, streaming, tool schema
├── agentic-filesystem  (link:../agentic-filesystem)  ← 文件系统后端
└── agentic-shell  (link:../agentic-shell)  ← shell 命令执行
```

## 关键约束（不能违反）

1. **agentic-core 已存在**：路径 `~/LOCAL/momo-agent/projects/agentic-core/agentic-core.js`
   - 不要创建新的 agentic-core 包
   - 不要在 packages/ 目录下创建任何东西
   - 接口：`agenticAsk(prompt, config, emit)`
   - streaming emit 事件：`emit('token', { text })` — 不是 'chunk'

2. **agentic-core 自定义 tool 格式**：
   ```js
   { name, description, parameters, execute: async (input) => string }
   ```

3. **ask.ts 要薄**：目标 <150 行，不实现 LLM 调用逻辑

4. **浏览器兼容**：不能有 Node.js 静态 import（fs、path 等）

## 文件结构

```
src/
  ask.ts          — 集成层，调用 agenticAsk()，定义 tools
  types.ts        — AgenticConfig, AgenticResult 等类型
  index.ts        — 导出 ask, askStream
  tools/
    file.ts       — file_read / file_write tool
    code.ts       — code_exec tool（QuickJS 沙箱）
    shell.ts      — shell_exec tool（agentic-shell）
    search.ts     — web_search tool
```

## ask.ts 工作原理

```ts
import agenticCoreModule from 'agentic-core'
const agenticAsk = agenticCoreModule.agenticAsk ?? agenticCoreModule

export async function ask(prompt, config) {
  const tools = buildTools(config)  // 把 file/code/shell tool 包装成 agenticAsk 格式
  const result = await agenticAsk(prompt, { ...config, tools, stream: false }, emit)
  return { answer, toolCalls, usage }
}

export async function* askStream(prompt, config) {
  // emit('token', { text }) → yield { type: 'text', text }
}
```

## 已验证的功能

- `ask()` — 多轮工具调用（file_write → file_read → 总结，3轮）✅
- `askStream()` — 真正 streaming，token 逐个推出 ✅
- 测试用 provider：mimo-v2-pro，baseUrl: https://api.xiaomimimo.com/anthropic

## 待完成

- 浏览器端验证（demo/app-demo.html）
- ask.ts 瘦身到 <100 行
- types.ts 清理无用字段
