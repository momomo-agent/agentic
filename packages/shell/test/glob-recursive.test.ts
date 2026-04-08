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

// DBB-m25-glob-001: **/*.ts matches files across subdirectories
describe('DBB-m25-glob-001: **/*.ts matches files across subdirectories', () => {
  it('finds .ts files in nested directories', async () => {
    const mockLs = vi.fn().mockImplementation(async (path: string) => {
      if (path === '/') return [{ name: 'src', type: 'dir' }, { name: 'a.ts', type: 'file' }]
      if (path === '/src') return [{ name: 'b.ts', type: 'file' }, { name: 'lib', type: 'dir' }]
      if (path === '/src/lib') return [{ name: 'c.ts', type: 'file' }]
      return []
    })
    const fs = makeMockFs({
      ls: mockLs,
      read: vi.fn().mockImplementation(async (path: string) => {
        if (path.endsWith('.ts')) return { content: 'ts-content', error: null }
        return { content: null, error: 'No such file or directory' }
      }),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('cat **/*.ts')
    // Should read all 3 .ts files
    expect(r.output).toContain('ts-content')
  })
})

// DBB-m25-glob-002: [abc] bracket expression matches character sets
describe('DBB-m25-glob-002: [abc] bracket expression matches character sets', () => {
  it('reads a.txt, b.txt, c.txt but not d.txt', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([
        { name: 'a.txt', type: 'file' },
        { name: 'b.txt', type: 'file' },
        { name: 'c.txt', type: 'file' },
        { name: 'd.txt', type: 'file' },
      ]),
      read: vi.fn().mockImplementation(async (path: string) => {
        const name = path.split('/').pop()
        return { content: name?.replace('.txt', ''), error: null }
      }),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('cat [abc].txt')
    expect(r.output).toContain('a')
    expect(r.output).toContain('b')
    expect(r.output).toContain('c')
    expect(r.output).not.toContain('d')
  })
})

// DBB-m25-glob-003: Combined **/[abc]*.ts pattern
describe('DBB-m25-glob-003: Combined **/[ab]*.ts pattern', () => {
  it('matches app.ts and alpha.ts but not beta.js', async () => {
    const mockLs = vi.fn().mockImplementation(async (path: string) => {
      if (path === '/') return [{ name: 'src', type: 'dir' }]
      if (path === '/src') return [
        { name: 'app.ts', type: 'file' },
        { name: 'lib', type: 'dir' },
      ]
      if (path === '/src/lib') return [
        { name: 'alpha.ts', type: 'file' },
        { name: 'beta.js', type: 'file' },
      ]
      return []
    })
    const fs = makeMockFs({ ls: mockLs })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('ls **/[ab]*.ts')
    expect(r.output).toContain('alpha.ts')
    expect(r.output).not.toContain('beta.js')
  })
})

// DBB-m25-glob-004: ** with no extension matches all files recursively
describe('DBB-m25-glob-004: **/* matches all files recursively', () => {
  it('matches files at all levels', async () => {
    const mockLs = vi.fn().mockImplementation(async (path: string) => {
      if (path === '/') return [{ name: 'a.txt', type: 'file' }, { name: 'sub', type: 'dir' }]
      if (path === '/sub') return [{ name: 'b.txt', type: 'file' }]
      return []
    })
    const fs = makeMockFs({ ls: mockLs })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('ls **/*')
    expect(r.output).toContain('a.txt')
    expect(r.output).toContain('b.txt')
  })
})

// DBB-m25-glob-005: find with glob pattern still works (no regression)
describe('DBB-m25-glob-005: find with glob still works', () => {
  it('find /dir -name "*.ts" works as before', async () => {
    const mockLs = vi.fn().mockImplementation(async (path: string) => {
      if (path === '/dir') return [{ name: 'a.ts', type: 'file' }, { name: 'b.js', type: 'file' }]
      return []
    })
    const fs = makeMockFs({ ls: mockLs })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('find /dir -name "*.ts"')
    expect(r.output).toContain('/dir/a.ts')
    expect(r.output).not.toContain('/dir/b.js')
  })
})

// DBB-m25-glob-006: Empty glob result returns appropriate error
describe('DBB-m25-glob-006: empty glob returns error', () => {
  it('cat **/*.xyz returns No such file or directory', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([]),
      read: vi.fn().mockResolvedValue({ content: null, error: 'No such file or directory' }),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('cat **/*.xyz')
    expect(r.output).toContain('No such file or directory')
  })
})
