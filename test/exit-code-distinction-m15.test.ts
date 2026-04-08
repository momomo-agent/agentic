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

describe('DBB-m15-001: exitCode 2 for unknown commands', () => {
  it('unknown command returns exitCode 2', async () => {
    const r = await new AgenticShell(makeFs()).exec('foobar')
    expect(r.exitCode).toBe(2)
  })

  it('unknown command with args returns exitCode 2', async () => {
    const r = await new AgenticShell(makeFs()).exec('xyz arg')
    expect(r.exitCode).toBe(2)
  })
})

describe('DBB-m15-002: exitCode 2 for missing operands', () => {
  it('cat with no args returns exitCode 2', async () => {
    const r = await new AgenticShell(makeFs()).exec('cat')
    expect(r.exitCode).toBe(2)
  })

  it('rm with no args returns exitCode 2', async () => {
    const r = await new AgenticShell(makeFs()).exec('rm')
    expect(r.exitCode).toBe(2)
  })

  it('grep with no args returns exitCode 2', async () => {
    const r = await new AgenticShell(makeFs()).exec('grep')
    expect(r.exitCode).toBe(2)
  })
})
