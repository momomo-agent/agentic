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

describe('Glob expansion edge cases', () => {
  it('flags starting with - are never glob-expanded', async () => {
    const readFn = vi.fn().mockResolvedValue({ content: 'data', error: null })
    const fs = makeMockFs({
      read: readFn,
      ls: vi.fn().mockResolvedValue([{ name: 'file.txt', type: 'file' }]),
    })
    const sh = new AgenticShell(fs)
    await sh.exec('cat -n file.txt')
    // -n should NOT trigger glob expansion
    expect(readFn).toHaveBeenCalledWith('/file.txt')
  })

  it('? wildcard matches single character', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([
        { name: 'a.txt', type: 'file' },
        { name: 'ab.txt', type: 'file' },
        { name: 'c.js', type: 'file' },
      ]),
      read: vi.fn().mockImplementation(async (path: string) => {
        if (path.endsWith('a.txt')) return { content: 'one', error: null }
        return { content: '', error: null }
      }),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('cat ?.txt')
    // ? should match single char only: a.txt matches, ab.txt doesn't
    expect(r.output).toContain('one')
    expect(r.exitCode).toBe(0)
  })

  it('cat with mixed glob and non-glob args', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([
        { name: 'a.txt', type: 'file' },
        { name: 'b.txt', type: 'file' },
      ]),
      read: vi.fn().mockImplementation(async (path: string) => {
        if (path.endsWith('a.txt')) return { content: 'aaa', error: null }
        if (path.endsWith('b.txt')) return { content: 'bbb', error: null }
        if (path.endsWith('c.txt')) return { content: 'ccc', error: null }
        return { content: '', error: null }
      }),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('cat *.txt c.txt')
    expect(r.output).toContain('aaa')
    expect(r.output).toContain('bbb')
    expect(r.output).toContain('ccc')
    expect(r.exitCode).toBe(0)
  })

  it('rm -r with glob removes files via recursive path', async () => {
    const deleteFn = vi.fn().mockResolvedValue(undefined)
    const fs = makeMockFs({
      ls: vi.fn().mockImplementation(async (path: string) => {
        if (path === '/') return [
          { name: 'a.log', type: 'file' },
          { name: 'b.log', type: 'file' },
        ]
        if (path === '/a.log' || path === '/b.log') return [] // file: ls returns empty
        throw new Error('not a directory')
      }),
      read: vi.fn().mockResolvedValue({ content: 'data', error: null }),
      delete: deleteFn,
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('rm -r *.log')
    expect(deleteFn).toHaveBeenCalledTimes(2)
    expect(r.exitCode).toBe(0)
  })

  it('cp with glob copies files preserving filenames', async () => {
    const written: Record<string, string> = {}
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([
        { name: 'a.md', type: 'file' },
        { name: 'b.md', type: 'file' },
      ]),
      read: vi.fn().mockImplementation(async (path: string) => {
        if (path.endsWith('a.md')) return { content: '# A', error: null }
        if (path.endsWith('b.md')) return { content: '# B', error: null }
        return { content: '', error: null }
      }),
      write: vi.fn().mockImplementation(async (path: string, content: string) => {
        written[path] = content
      }),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('cp *.md /dest/')
    expect(Object.keys(written).length).toBe(2)
    expect(r.exitCode).toBe(0)
  })

  it('glob with single match still works', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([
        { name: 'single.txt', type: 'file' },
        { name: 'other.js', type: 'file' },
      ]),
      read: vi.fn().mockResolvedValue({ content: 'found', error: null }),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('cat *.txt')
    expect(r.output).toContain('found')
    expect(r.exitCode).toBe(0)
  })

  it('glob pattern does not match directories', async () => {
    const readFn = vi.fn().mockResolvedValue({ content: 'data', error: null })
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([
        { name: 'mydir', type: 'dir' },
        { name: 'file.txt', type: 'file' },
      ]),
      read: readFn,
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('cat *.txt')
    // Should only match file.txt, not the directory
    expect(readFn).toHaveBeenCalledTimes(1)
    expect(readFn).toHaveBeenCalledWith('/file.txt')
  })

  it('rm *.nonexistent returns error when no glob match', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([{ name: 'a.ts', type: 'file' }]),
      read: vi.fn().mockResolvedValue({ content: null, error: 'No such file or directory' }),
      delete: vi.fn().mockResolvedValue(undefined),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('rm *.xyz')
    // When glob doesn't match, the pattern is kept as-is and rm reports error
    expect(r.exitCode).toBe(1)
    expect(r.output.length).toBeGreaterThan(0)
  })

  it('cat with empty args returns missing operand', async () => {
    const fs = makeMockFs()
    const sh = new AgenticShell(fs)
    const r = await sh.exec('cat')
    expect(r.output).toContain('missing operand')
    expect(r.exitCode).toBe(2)
  })

  it('ls glob pattern only shows filenames not full paths', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([
        { name: 'a.ts', type: 'file' },
        { name: 'b.ts', type: 'file' },
      ]),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('ls *.ts')
    // Should show just filenames, not full paths
    const lines = r.output.split('\n')
    expect(lines).toContain('a.ts')
    expect(lines).toContain('b.ts')
    expect(lines.every(l => !l.includes('/'))).toBe(true)
  })
})
