import { describe, it, expect, vi } from 'vitest'
import { AgenticShell } from '../src/index'
import type { AgenticFileSystem } from 'agentic-filesystem'

function makeMockFs(overrides = {}): AgenticFileSystem {
  return {
    ls: vi.fn().mockResolvedValue([]),
    read: vi.fn().mockResolvedValue({ content: undefined, error: 'not a file' }),
    write: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    grep: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as AgenticFileSystem
}

// DBB-m24-mkdir-001: mkdir parent-missing error uses UNIX format
describe('DBB-m24-mkdir-001: mkdir parent-missing error uses UNIX format', () => {
  it('returns exact UNIX format error', async () => {
    const fs = makeMockFs({ ls: vi.fn().mockRejectedValue(new Error('No such file or directory')) })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('mkdir /a/b/c')).output
    expect(out).toBe('mkdir: /a/b/c: No such file or directory')
  })

  it('error format does not contain "cannot create directory"', async () => {
    const fs = makeMockFs({ ls: vi.fn().mockRejectedValue(new Error('No such file or directory')) })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('mkdir /a/b/c')).output
    expect(out).not.toContain('cannot create directory')
  })

  it('error format follows cmd: path: reason pattern', async () => {
    const fs = makeMockFs({ ls: vi.fn().mockRejectedValue(new Error('No such file or directory')) })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('mkdir /missing/parent/dir')).output
    expect(out).toMatch(/^mkdir: .+: No such file or directory$/)
  })
})

// DBB-m24-mkdir-002: mkdir -p still works (no regression)
describe('DBB-m24-mkdir-002: mkdir -p still works (no regression)', () => {
  it('mkdir -p creates nested directories', async () => {
    const mockMkdir = vi.fn().mockResolvedValue(undefined)
    const fs = makeMockFs({ mkdir: mockMkdir } as any)
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('mkdir -p /a/b/c')).output
    expect(out).toBe('')
    expect(mockMkdir).toHaveBeenCalledWith('/a')
    expect(mockMkdir).toHaveBeenCalledWith('/a/b')
    expect(mockMkdir).toHaveBeenCalledWith('/a/b/c')
  })

  it('mkdir -p ignores already-exists errors', async () => {
    const mockMkdir = vi.fn().mockRejectedValue(new Error('already exists'))
    const fs = makeMockFs({ mkdir: mockMkdir } as any)
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('mkdir -p /existing')).output
    expect(out).toBe('')
  })
})

// DBB-m24-mkdir-003: mkdir on readOnly fs returns permission error
describe('DBB-m24-mkdir-003: mkdir on readOnly fs returns permission error', () => {
  it('returns Permission denied when fs is read-only', async () => {
    const fs = makeMockFs() as any
    fs.readOnly = true
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('mkdir /newdir')).output
    expect(out).toBe('mkdir: /newdir: Permission denied')
  })

  it('returns exitCode 1 on permission denied', async () => {
    const fs = makeMockFs() as any
    fs.readOnly = true
    const sh = new AgenticShell(fs)
    const r = await sh.exec('mkdir /newdir')
    expect(r.exitCode).toBe(1)
  })
})
