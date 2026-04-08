// demo.ts — Demo using agentic-store backend

import { AgenticFileSystem, AgenticStoreBackend } from './dist/index.js'

// Mock agentic-store for demo (in real usage, import from 'agentic-store')
const mockStore = {
  data: new Map(),
  async get(key) { return this.data.get(key) },
  async set(key, value) { this.data.set(key, value) },
  async delete(key) { this.data.delete(key) },
  async keys() { return Array.from(this.data.keys()) },
  async has(key) { return this.data.has(key) }
}

async function demo() {
  console.log('🗂️  agentic-filesystem demo (with agentic-store)\n')

  // Create filesystem with agentic-store backend
  const fs = new AgenticFileSystem({
    storage: new AgenticStoreBackend(mockStore),
    readOnly: false
  })

  // Write some files
  console.log('📝 Writing files...')
  await fs.write('/docs/intro.md', '# Introduction\nWelcome to agentic-filesystem.\nThis is a virtual filesystem for AI agents.')
  await fs.write('/docs/guide.md', '# User Guide\nHow to use grep and other commands.')
  await fs.write('/code/example.js', 'console.log("Hello from virtual filesystem")')
  console.log('   ✓ Created 3 files\n')

  // List files
  console.log('📂 Listing files...')
  const allFiles = await fs.ls()
  allFiles.forEach(f => console.log(`   ${f.name}`))
  console.log()

  // Read a file
  console.log('📖 Reading /docs/intro.md...')
  const readResult = await fs.read('/docs/intro.md')
  console.log(`   ${readResult.content?.split('\n')[0]}\n`)

  // Grep for pattern
  console.log('🔍 Grep for "virtual"...')
  const grepResults = await fs.grep('virtual')
  grepResults.forEach(r => {
    console.log(`   ${r.path}:${r.line} — ${r.content}`)
  })
  console.log()

  // List files in /docs
  console.log('📂 Listing /docs...')
  const docsFiles = await fs.ls('/docs')
  docsFiles.forEach(f => console.log(`   ${f.name}`))
  console.log()

  // Show tool definitions
  console.log('🛠️  Available tools for AI agents:')
  const tools = fs.getToolDefinitions()
  tools.forEach(t => console.log(`   - ${t.name}: ${t.description}`))
  console.log()

  console.log('✅ Demo complete!')
  console.log('\n💡 In production, use real agentic-store:')
  console.log('   const store = await createStore("my-fs")')
  console.log('   const fs = new AgenticFileSystem({ storage: new AgenticStoreBackend(store) })')
}

demo().catch(console.error)
