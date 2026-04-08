import { describe, it, expect, vi } from 'vitest'
import { AgenticShell } from '../src/index'
import type { AgenticFileSystem } from 'agentic-filesystem'

function makeFs(overrides = {}): AgenticFileSystem {
  return {
    ls: vi.fn().mockResolvedValue([]),
    read: vi.fn().mockResolvedValue({ content: '', error: null }),
    write: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    grep: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as AgenticFileSystem
}

describe('Exit code edge cases (task-1775576245522)', () => {
  it('unknown command returns exitCode 2', async () => {
    const result = await new AgenticShell(makeFs()).exec('foobar')
    expect(result.exitCode).toBe(2)
    expect(result.output).toContain('command not found')
  })

  it('ls on existing dir returns exitCode 0', async () => {
    const fs = makeFs({ ls: vi.fn().mockResolvedValue([{ name: 'a.txt', type: 'file' }]) })
    const result = await new AgenticShell(fs).exec('ls')
    expect(result.exitCode).toBe(0)
  })

  it('cat nonexistent returns exitCode 1', async () => {
    const fs = makeFs({ read: vi.fn().mockResolvedValue({ content: null, error: 'No such file or directory' }) })
    const result = await new AgenticShell(fs).exec('cat /nonexistent')
    expect(result.exitCode).toBe(1)
  })

  it('grep with no args returns exitCode 2', async () => {
    const result = await new AgenticShell(makeFs()).exec('grep')
    expect(result.exitCode).toBe(2)
  })

  it('multiple unknown commands each return exitCode 2', async () => {
    const sh = new AgenticShell(makeFs())
    for (const cmd of ['foo', 'bar', 'baz']) {
      const r = await sh.exec(cmd)
      expect(r.exitCode).toBe(2)
    }
  })

  it('unknown command with args returns exitCode 2', async () => {
    const result = await new AgenticShell(makeFs()).exec('notacommand arg1 arg2')
    expect(result.exitCode).toBe(2)
    expect(result.output).toContain('command not found')
  })
})
