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

// ── DBB-M10-003: mkdir without fs.mkdir support — .keep fallback ───────────

describe('DBB-M10-003: mkdir without fs.mkdir writes .keep fallback', () => {
  it('mkdir writes .keep file when fs.mkdir unavailable', async () => {
    const fs = makeMockFs()
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('mkdir /newdir')).output
    expect(out).toBe('')
    expect(fs.write).toHaveBeenCalledWith('/newdir/.keep', '')
  })
})

// ── DBB-M10-009: mkdir -p without fs.mkdir support ─────────────────────────

describe('DBB-M10-009: mkdir -p without fs.mkdir writes .keep for each segment', () => {
  it('mkdir -p writes .keep files for each segment when fs.mkdir unavailable', async () => {
    const fs = makeMockFs()
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('mkdir -p /a/b/c')).output
    expect(out).toBe('')
    expect(fs.write).toHaveBeenCalledWith('/a/.keep', '')
    expect(fs.write).toHaveBeenCalledWith('/a/b/.keep', '')
    expect(fs.write).toHaveBeenCalledWith('/a/b/c/.keep', '')
  })
})

// ── DBB-M10-004: mkdir with fs.mkdir support — normal operation ────────────

describe('DBB-M10-004: mkdir with fs.mkdir works normally', () => {
  it('mkdir calls fs.mkdir when available', async () => {
    const mockMkdir = vi.fn().mockResolvedValue(undefined)
    const fs = makeMockFs({ mkdir: mockMkdir } as any)
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('mkdir /newdir')).output
    expect(out).toBe('')
    expect(mockMkdir).toHaveBeenCalledWith('/newdir')
    expect(fs.write).not.toHaveBeenCalled()
  })

  it('mkdir -p calls fs.mkdir for each segment when available', async () => {
    const mockMkdir = vi.fn().mockResolvedValue(undefined)
    const fs = makeMockFs({ mkdir: mockMkdir } as any)
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('mkdir -p /a/b/c')).output
    expect(out).toBe('')
    expect(mockMkdir).toHaveBeenCalledWith('/a')
    expect(mockMkdir).toHaveBeenCalledWith('/a/b')
    expect(mockMkdir).toHaveBeenCalledWith('/a/b/c')
    expect(fs.write).not.toHaveBeenCalled()
  })
})

// ── DBB-M10-010: mkdir fallback respects readOnly ──────────────────────────

describe('DBB-M10-010: mkdir fallback respects readOnly permission check', () => {
  it('mkdir returns Permission denied for readOnly fs with fallback', async () => {
    const fs = makeMockFs({ readOnly: true })
    delete (fs as any).mkdir
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('mkdir /newdir')).output
    expect(out).toContain('Permission denied')
    expect(fs.write).not.toHaveBeenCalled()
  })
})
