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

// DBB-M10-005: grep on non-existent directory
describe('DBB-M10-005: grep -r on non-existent directory', () => {
  it('returns UNIX error when fs.ls throws', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockRejectedValue(new Error('No such file or directory')),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('grep -r pattern /nonexistent')).output
    expect(out).toMatch(/grep: \/nonexistent: No such file or directory/)
  })

  it('error follows UNIX format <cmd>: <path>: <reason>', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockRejectedValue(new Error('No such file or directory')),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('grep -r foo /missing')).output
    expect(out).toMatch(/^grep: \/missing:/)
  })
})

// DBB-M10-006: grep -r with zero matches (empty result, not error)
describe('DBB-M10-006: grep -r with no matches returns empty string', () => {
  it('returns empty string when dir exists but no matches', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([{ name: 'file.txt', type: 'file' }]),
      grep: vi.fn().mockResolvedValue([]),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('grep -r nonexistent-pattern /emptydir')).output
    expect(out).toBe('')
  })
})

// DBB-M10-010: grep error vs no-match distinction
describe('DBB-M10-010: grep error vs no-match distinction', () => {
  it('missing directory → error message', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockRejectedValue(new Error('not found')),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('grep -r pat /nodir')).output
    expect(out).toContain('grep:')
    expect(out).toContain('/nodir')
  })

  it('no matches → empty output (not an error)', async () => {
    const fs = makeMockFs({
      grep: vi.fn().mockResolvedValue([]),
    })
    const sh = new AgenticShell(fs)
    // Use -r to go through fs.grep path (not grepStream)
    const out = (await sh.exec('grep -r pattern /dir')).output
    expect(out).toBe('')
  })

  it('matches found → output lines', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([{ name: 'file.txt', type: 'file' }]),
      grep: vi.fn().mockResolvedValue([
        { path: '/dir/file.txt', line: 1, content: 'pattern here' },
      ]),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('grep -r pattern /dir')).output
    expect(out).toContain('pattern here')
  })
})
