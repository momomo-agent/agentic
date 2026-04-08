import { describe, it, expect, vi } from 'vitest'
import { AgenticShell } from '../src/index'
import type { AgenticFileSystem } from 'agentic-filesystem'

function makeMockFs(overrides = {}): AgenticFileSystem {
  return {
    ls: vi.fn().mockResolvedValue([]),
    read: vi.fn().mockResolvedValue({ content: '', error: null }),
    write: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    grep: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as AgenticFileSystem
}

describe('exitCode 2 vs 127 distinction (task-1775571373147)', () => {
  it('returns 2 for unknown command', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('foobar')
    expect(r.exitCode).toBe(2)
  })

  it('returns 2 for missing operand (cat)', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('cat')
    expect(r.exitCode).toBe(2)
  })

  it('returns 2 for missing pattern (grep)', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('grep')
    expect(r.exitCode).toBe(2)
  })
})
