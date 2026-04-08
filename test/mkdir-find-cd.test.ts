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

// ── task-1775531800002: cd path validation ──────────────────────────────────

describe('DBB-007: cd to non-existent directory', () => {
  it('returns error and cwd unchanged', async () => {
    const fs = makeMockFs({ ls: vi.fn().mockRejectedValue(new Error('No such file or directory')) })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('cd /no/such/dir')).output
    expect(out).toContain('/no/such/dir')
    expect(out).toMatch(/No such file or directory/i)
    expect((await sh.exec('pwd')).output).toBe('/')
  })
})

describe('DBB-008: cd to a file', () => {
  it('returns Not a directory and cwd unchanged', async () => {
    const fs = makeMockFs({ read: vi.fn().mockResolvedValue({ content: 'data', error: null }) })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('cd /file.txt')).output
    expect(out).toContain('/file.txt')
    expect(out).toMatch(/Not a directory/i)
    expect((await sh.exec('pwd')).output).toBe('/')
  })
})

describe('DBB-009: cd to valid directory', () => {
  it('updates cwd', async () => {
    const sh = new AgenticShell(makeMockFs())
    await sh.exec('cd /subdir')
    expect((await sh.exec('pwd')).output).toBe('/subdir')
  })
})

describe('cd edge cases', () => {
  it('cd with no arg resets to /', async () => {
    const sh = new AgenticShell(makeMockFs())
    await sh.exec('cd /subdir')
    await sh.exec('cd')
    expect((await sh.exec('pwd')).output).toBe('/')
  })

  it('cd ~ resets to /', async () => {
    const sh = new AgenticShell(makeMockFs())
    await sh.exec('cd /subdir')
    await sh.exec('cd ~')
    expect((await sh.exec('pwd')).output).toBe('/')
  })
})

// ── task-1775531800003: mkdir native + -p ───────────────────────────────────

describe('DBB-010: mkdir creates directory', () => {
  it('calls mkdirOne for new directory', async () => {
    const mockMkdir = vi.fn().mockResolvedValue(undefined)
    const fs = makeMockFs({ mkdir: mockMkdir } as any)
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('mkdir /newdir')).output
    expect(out).toBe('')
    expect(mockMkdir).toHaveBeenCalledWith('/newdir')
  })

  it('falls back to .keep write when mkdir not available', async () => {
    const fs = makeMockFs()
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('mkdir /newdir')).output
    expect(out).toBe('')
    expect(fs.write).toHaveBeenCalledWith('/newdir/.keep', '')
  })
})

describe('DBB-011: mkdir -p creates nested directories', () => {
  it('creates all intermediate paths', async () => {
    const mockMkdir = vi.fn().mockResolvedValue(undefined)
    const fs = makeMockFs({ mkdir: mockMkdir } as any)
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('mkdir -p /a/b/c')).output
    expect(out).toBe('')
    expect(mockMkdir).toHaveBeenCalledWith('/a')
    expect(mockMkdir).toHaveBeenCalledWith('/a/b')
    expect(mockMkdir).toHaveBeenCalledWith('/a/b/c')
  })

  it('-p ignores already-exists errors', async () => {
    const mockMkdir = vi.fn().mockRejectedValue(new Error('already exists'))
    const fs = makeMockFs({ mkdir: mockMkdir } as any)
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('mkdir -p /existing')).output
    expect(out).toBe('')
  })
})

describe('DBB-012: mkdir without -p fails if parent missing', () => {
  it('returns UNIX format error when parent does not exist', async () => {
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
})

// ── task-1775531800004: find -type filter fix ───────────────────────────────

describe('DBB-013: find -type f returns only files', () => {
  it('filters by entry.type === file', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([
        { name: 'file1.ts', type: 'file' },
        { name: 'file2.txt', type: 'file' },
        { name: 'subdir', type: 'dir' },
      ]),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('find /dir -type f')).output
    expect(out).toContain('file1.ts')
    expect(out).toContain('file2.txt')
    expect(out).not.toContain('subdir')
  })
})

describe('DBB-014: find -type d returns only directories', () => {
  it('filters by entry.type === dir', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([
        { name: 'file1.ts', type: 'file' },
        { name: 'subdir', type: 'dir' },
      ]),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('find /dir -type d')).output
    expect(out).not.toContain('file1.ts')
    expect(out).toContain('subdir')
  })
})

describe('DBB-015: find without -type returns all entries', () => {
  it('returns all entries', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([
        { name: 'file1.ts', type: 'file' },
        { name: 'subdir', type: 'dir' },
      ]),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('find /dir')).output
    expect(out).toContain('file1.ts')
    expect(out).toContain('subdir')
  })
})

describe('find -type f -name combined filter', () => {
  it('applies both type and name filters', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([
        { name: 'index.ts', type: 'file' },
        { name: 'README.md', type: 'file' },
        { name: 'src', type: 'dir' },
      ]),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('find /dir -type f -name "*.ts"')).output
    expect(out).toContain('index.ts')
    expect(out).not.toContain('README.md')
    expect(out).not.toContain('src')
  })
})
