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

describe('grep -l flag (list filenames only)', () => {
  it('returns unique filenames without line numbers', async () => {
    const fs = makeMockFs({
      grep: vi.fn().mockResolvedValue([
        { path: '/src/a.txt', line: 1, content: 'hello' },
        { path: '/src/a.txt', line: 5, content: 'hello world' },
        { path: '/src/b.txt', line: 2, content: 'hello' },
      ]),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('grep -l hello')).output
    expect(out).toBe('/src/a.txt\n/src/b.txt')
    expect(out).not.toContain(':1:')
    expect(out).not.toContain(':5:')
  })

  it('deduplicates filenames when multiple matches in same file', async () => {
    const fs = makeMockFs({
      grep: vi.fn().mockResolvedValue([
        { path: '/file.txt', line: 1, content: 'match' },
        { path: '/file.txt', line: 3, content: 'match' },
        { path: '/file.txt', line: 7, content: 'match' },
      ]),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('grep -l match')).output
    expect(out).toBe('/file.txt')
  })
})

describe('grep -c flag (count matches)', () => {
  it('returns count of matching lines', async () => {
    const fs = makeMockFs({
      grep: vi.fn().mockResolvedValue([
        { path: '/a.txt', line: 1, content: 'foo' },
        { path: '/b.txt', line: 2, content: 'foo' },
        { path: '/c.txt', line: 3, content: 'foo' },
      ]),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('grep -c foo')).output
    expect(out).toBe('3')
  })

  it('returns 0 when no matches', async () => {
    const fs = makeMockFs({ grep: vi.fn().mockResolvedValue([]) })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('grep -c pattern')).output
    expect(out).toBe('0')
  })
})

describe('grep -r with path scoping', () => {
  it('filters results to specified directory', async () => {
    const fs = makeMockFs({
      grep: vi.fn().mockResolvedValue([
        { path: '/src/file.txt', line: 1, content: 'match' },
        { path: '/test/file.txt', line: 1, content: 'match' },
        { path: '/docs/file.txt', line: 1, content: 'match' },
      ]),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('grep -r match /src')).output
    expect(out).toContain('/src/file.txt')
    expect(out).not.toContain('/test/file.txt')
    expect(out).not.toContain('/docs/file.txt')
  })

  it('defaults to cwd when -r used without path', async () => {
    const fs = makeMockFs({
      grep: vi.fn().mockResolvedValue([
        { path: '/home/user/file.txt', line: 1, content: 'match' },
        { path: '/other/file.txt', line: 1, content: 'match' },
      ]),
      read: vi.fn().mockResolvedValue({ content: undefined, error: 'is a directory' }),
    })
    const sh = new AgenticShell(fs)
    await sh.exec('cd /home/user')
    const out = (await sh.exec('grep -r match')).output
    expect(out).toContain('/home/user/file.txt')
    expect(out).not.toContain('/other/file.txt')
  })

  it('supports multiple paths', async () => {
    const fs = makeMockFs({
      grep: vi.fn().mockResolvedValue([
        { path: '/src/a.txt', line: 1, content: 'match' },
        { path: '/test/b.txt', line: 1, content: 'match' },
        { path: '/docs/c.txt', line: 1, content: 'match' },
      ]),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('grep -r match /src /test')).output
    expect(out).toContain('/src/a.txt')
    expect(out).toContain('/test/b.txt')
    expect(out).not.toContain('/docs/c.txt')
  })
})

describe('grep -R flag (uppercase)', () => {
  it('works same as -r', async () => {
    const fs = makeMockFs({
      grep: vi.fn().mockResolvedValue([
        { path: '/dir/file.txt', line: 1, content: 'match' },
      ]),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('grep -R match /dir')).output
    expect(out).toContain('/dir/file.txt')
  })
})

describe('grep combined flags', () => {
  it('-r -l returns unique filenames from directory', async () => {
    const fs = makeMockFs({
      grep: vi.fn().mockResolvedValue([
        { path: '/src/a.txt', line: 1, content: 'match' },
        { path: '/src/a.txt', line: 5, content: 'match' },
        { path: '/src/b.txt', line: 2, content: 'match' },
        { path: '/other/c.txt', line: 1, content: 'match' },
      ]),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('grep -r -l match /src')).output
    expect(out).toBe('/src/a.txt\n/src/b.txt')
  })

  it('-r -c returns count from directory', async () => {
    const fs = makeMockFs({
      grep: vi.fn().mockResolvedValue([
        { path: '/src/a.txt', line: 1, content: 'match' },
        { path: '/src/b.txt', line: 2, content: 'match' },
        { path: '/other/c.txt', line: 1, content: 'match' },
      ]),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('grep -r -c match /src')).output
    expect(out).toBe('2')
  })
})

describe('grep edge cases', () => {
  it('handles pattern with no matches', async () => {
    const fs = makeMockFs({ grep: vi.fn().mockResolvedValue([]) })
    const sh = new AgenticShell(fs)
    expect((await sh.exec('grep nomatch')).output).toBe('')
  })

  it('returns error when pattern is missing', async () => {
    const fs = makeMockFs()
    const sh = new AgenticShell(fs)
    expect((await sh.exec('grep')).output).toBe('grep: missing pattern')
  })

  it('handles empty results with -l flag', async () => {
    const fs = makeMockFs({ grep: vi.fn().mockResolvedValue([]) })
    const sh = new AgenticShell(fs)
    expect((await sh.exec('grep -l pattern')).output).toBe('')
  })

  it('formats output correctly with line numbers', async () => {
    const fs = makeMockFs({
      grep: vi.fn().mockResolvedValue([
        { path: '/file.txt', line: 42, content: 'the answer' },
      ]),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('grep answer')).output
    expect(out).toBe('/file.txt:42: the answer')
  })
})
