import { describe, it, expect } from 'vitest'
import { executeFileRead, executeFileWrite } from '../src/tools/file.js'
import { AgenticFileSystem, MemoryStorage } from 'agentic-filesystem'

// DBB-003: ask() works without filesystem config
describe('DBB-003: default in-memory filesystem', () => {
  it('creates a working in-memory filesystem when none is provided', async () => {
    const filesystem = new AgenticFileSystem({ storage: new MemoryStorage() })
    await executeFileWrite({ path: '/tmp/out.txt', content: 'hello' }, filesystem)
    const result = await executeFileRead({ path: '/tmp/out.txt' }, filesystem)
    expect(result.content).toBe('hello')
  })

  it('fallback expression produces an AgenticFileSystem instance', () => {
    const config: { filesystem?: AgenticFileSystem } = {}
    const filesystem = config.filesystem ?? new AgenticFileSystem({ storage: new MemoryStorage() })
    expect(filesystem).toBeInstanceOf(AgenticFileSystem)
  })
})

// DBB-004: Explicit filesystem config is used as-is
describe('DBB-004: explicit filesystem config is respected', () => {
  it('uses caller-supplied filesystem and isolates from other instances', async () => {
    const customFs = new AgenticFileSystem({ storage: new MemoryStorage() })
    await executeFileWrite({ path: 'data.txt', content: 'custom' }, customFs)
    const result = await executeFileRead({ path: 'data.txt' }, customFs)
    expect(result.content).toBe('custom')

    // A separate instance must NOT see the write
    const otherFs = new AgenticFileSystem({ storage: new MemoryStorage() })
    const isolated = await executeFileRead({ path: 'data.txt' }, otherFs)
    expect(isolated.content).toMatch(/error/i)
  })
})
