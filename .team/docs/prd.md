# PRD — agentic-lite 浏览器版升级

## 已完成（2026-04-07）
- ✓ 修复 agent loop 支持多轮工具调用
- ✓ file 工具换成 agentic-filesystem
- ✓ code 工具换成浏览器兼容实现

## 新需求：让 AI 真正"以为自己在电脑上"

### 1. code_exec 多语言支持
**目标：** AI 能用 JavaScript 和 Python 写代码

**实现：**
- 自动检测语言（根据代码特征：`import`/`def`/`print` → Python，其他 → JS）
- JavaScript：当前的 `AsyncFunction` eval（已有）
- Python：
  - 浏览器：Pyodide WASM（`loadPyodide()` + `pyodide.runPython()`）
  - Node/Electron：`child_process.spawn('python3', ['-c', code])`

**接口不变：** `code_exec(code: string)` 自动判断语言

### 2. code_exec 内注入 filesystem API
**目标：** AI 在代码里能像真实环境一样读写文件

**JavaScript 注入：**
```js
const fs = {
  readFileSync: (path) => config.filesystem.read(path).content,
  writeFileSync: (path, data) => config.filesystem.write(path, data),
  existsSync: (path) => config.filesystem.read(path).content !== null,
}
// 执行时注入到 scope
new Function('fs', 'console', code)(fs, mockConsole)
```

**Python 注入：**
```python
# 在 Pyodide 或 subprocess 前注入
def open(path, mode='r'):
    if 'r' in mode:
        return StringIO(filesystem.read(path).content)
    elif 'w' in mode:
        return FilesystemWriter(path, filesystem)
```

**效果：** AI 写 `fs.readFileSync('/data.json')` 或 `open('/data.txt')` 就能直接操作虚拟文件系统

### 3. shell_exec tool
**目标：** AI 能跑 shell 命令

**Tool 定义：**
```ts
{
  name: 'shell_exec',
  description: 'Execute shell commands (ls, cat, grep, find, etc.)',
  parameters: {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'Shell command to execute' }
    },
    required: ['command']
  }
}
```

**实现：**
```ts
import { AgenticShell } from 'agentic-shell'
const shell = new AgenticShell(config.filesystem)
const output = await shell.exec(input.command)
```

**效果：** AI 能调 `shell_exec("ls /")` 或 `shell_exec("grep hello /src/*.js")`

## 验收标准
- AI 能用 Python 写代码并执行
- AI 在代码里能直接读写文件（不用显式调 file_read/file_write）
- AI 能用 shell 命令探索文件系统
- 三个 tool（code/file/shell）协同工作，完成复杂任务
