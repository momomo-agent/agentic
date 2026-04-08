import { AgenticFileSystem, NodeFsBackend } from '../agentic-filesystem/dist/index.js'
import { AgenticShell } from '../agentic-shell/dist/index.js'
import { ask } from './dist/index.js'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'

const tmp = await mkdtemp(tmpdir() + '/agentic-test-')
const filesystem = new AgenticFileSystem({ storage: new NodeFsBackend(tmp) })
const shell = new AgenticShell(filesystem)

// 预置一些文件
await filesystem.write('/data/numbers.txt', '1\n2\n3\n4\n5\n6\n7\n8\n9\n10')
await filesystem.write('/src/hello.py', 'print("hello from python")')

console.log('=== 预置文件 ===')
console.log(await shell.exec('ls /'))
console.log(await shell.exec('ls /data'))

const FOX_KEY = process.env.FOX_KEY

console.log('\n=== 发任务给 AI ===')
const result = await ask(
  `你现在在一台电脑上。请完成以下任务：
1. 用 shell_exec 列出 /data 目录的文件
2. 用 file_read 读取 /data/numbers.txt
3. 用 code_exec 计算这些数字的总和和平均值
4. 把结果写入 /data/result.txt
5. 用 shell_exec 验证文件已创建`,
  {
    apiKey: FOX_KEY,
    baseUrl: 'https://code.newcli.com/claude/ultra',
    provider: 'anthropic',
    tools: ['file', 'code', 'shell'],
    filesystem,
  }
)

console.log('\n=== 工具调用 ===')
for (const tc of result.toolCalls ?? []) {
  console.log(`[${tc.tool}]`, JSON.stringify(tc.input).slice(0, 80))
  console.log('  →', String(tc.output).slice(0, 100))
}

console.log('\n=== AI 回答 ===')
console.log(result.answer)

console.log('\n=== 验证结果文件 ===')
console.log(await shell.exec('cat /data/result.txt'))
