import { describe, it, expect } from 'vitest'
import { AgenticFileSystem, MemoryStorage } from 'agentic-filesystem'
import { executeShell } from '../src/tools/shell.js'

function makeFs() {
  return new AgenticFileSystem({ storage: new MemoryStorage() })
}

describe('shell_exec tool', () => {
  it('returns error for empty command', async () => {
    const result = await executeShell({ command: '' }, makeFs())
    expect(result.error).toContain('No command provided')
    expect(result.exitCode).toBe(1)
  })

  it('returns error when no filesystem configured', async () => {
    const result = await executeShell({ command: 'ls' })
    expect(result.error).toContain('No filesystem configured')
    expect(result.exitCode).toBe(1)
  })

  it('ls lists files in directory', async () => {
    const fs = makeFs()
    await fs.write('/file1.txt', 'a')
    await fs.write('/file2.txt', 'b')
    const result = await executeShell({ command: 'ls /' }, fs)
    expect(result.exitCode).toBe(0)
    expect(result.output).toContain('file1.txt')
    expect(result.output).toContain('file2.txt')
  })

  it('cat reads file content', async () => {
    const fs = makeFs()
    await fs.write('/test.txt', 'hello world')
    const result = await executeShell({ command: 'cat /test.txt' }, fs)
    expect(result.exitCode).toBe(0)
    expect(result.output).toContain('hello world')
  })

  it('returns command in result', async () => {
    const fs = makeFs()
    const result = await executeShell({ command: 'ls /' }, fs)
    expect(result.command).toBe('ls /')
  })
})
