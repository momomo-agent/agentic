import { AgenticFileSystem } from '../agentic-filesystem/dist/index.js'
import { ask } from './dist/index.js'

class MemBackend {
  constructor() { this.store = new Map() }
  async get(k) { return this.store.get(k) ?? null }
  async set(k, v) { this.store.set(k, v) }
  async delete(k) { this.store.delete(k) }
  async list(prefix) { return [...this.store.keys()].filter(k => !prefix || k.startsWith(prefix)) }
  async scan() { return [] }
}

const filesystem = new AgenticFileSystem({ storage: new MemBackend() })

const result = await ask(
  '用 code_exec 跑这段多行代码：\nconst arr = [1,2,3,4,5]\nconsole.log("sum:", arr.reduce((a,b)=>a+b,0))\narr.length',
  {
    apiKey: process.env.FOX_KEY,
    baseUrl: 'https://code.newcli.com/claude/ultra',
    provider: 'anthropic',
    tools: ['code'],
    filesystem,
  }
)

for (const tc of result.toolCalls ?? []) {
  console.log('code:', tc.input.code)
  console.log('output:', tc.output)
}
console.log('answer:', result.answer.slice(0, 200))
