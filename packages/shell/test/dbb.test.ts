import { describe, it, expect, vi, beforeEach } from 'vitest'
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

describe('DBB-001: grep -r recursive search', () => {
  it('returns matches from nested paths', async () => {
    const fs = makeMockFs({
      grep: vi.fn().mockResolvedValue([
        { path: '/src/a.txt', line: 1, content: 'hello' },
        { path: '/src/sub/b.txt', line: 2, content: 'hello world' },
        { path: '/other/c.txt', line: 1, content: 'hello' },
      ]),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('grep -r hello /src')).output
    expect(out).toContain('/src/a.txt:1: hello')
    expect(out).toContain('/src/sub/b.txt:2: hello world')
    expect(out).not.toContain('/other/c.txt')
  })
})

describe('DBB-002: grep -r no match', () => {
  it('returns empty string when no files match', async () => {
    const fs = makeMockFs({ grep: vi.fn().mockResolvedValue([]) })
    const sh = new AgenticShell(fs)
    expect((await sh.exec('grep -r pattern /dir')).output).toBe('')
  })
})

describe('DBB-003: grep -r on non-existent directory', () => {
  it('returns error message for nonexistent path', async () => {
    const fs = makeMockFs({
      grep: vi.fn().mockResolvedValue([]),
      ls: vi.fn().mockRejectedValue(new Error('No such file or directory')),
      read: vi.fn().mockResolvedValue({ content: null, error: 'No such file or directory' }),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('grep -r pattern /nonexistent')).output
    // DBB requires error message with path and reason — currently returns ''
    // This test documents the expected behavior; will fail until fixed
    expect(out).toMatch(/nonexistent/)
    expect(out).toMatch(/No such file or directory/i)
  })
})

describe('DBB-004: pipe — cat file | grep pattern', () => {
  it('returns only matching lines', async () => {
    const fs = makeMockFs({
      read: vi.fn().mockResolvedValue({ content: 'foo\nbar\nbaz', error: null }),
    })
    const sh = new AgenticShell(fs)
    expect((await sh.exec('cat file.txt | grep ba')).output).toBe('bar\nbaz')
  })
})

describe('DBB-005: pipe — echo | grep', () => {
  it('echo "hello world" | grep hello returns hello world', async () => {
    const sh = new AgenticShell(makeMockFs())
    expect((await sh.exec('echo hello world | grep hello')).output).toBe('hello world')
  })
})

describe('DBB-006: pipe — left command fails', () => {
  it('cat nonexistent | grep propagates error or returns empty', async () => {
    const fs = makeMockFs({
      read: vi.fn().mockResolvedValue({ content: null, error: 'No such file' }),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('cat /nonexistent | grep pattern')).output
    // grep on error string should not crash; output is empty or error
    expect(typeof out).toBe('string')
    expect(out).not.toContain('pattern') // grep should not match the pattern in error msg unless it does
  })
})

describe('DBB-007: error message — file not found UNIX format', () => {
  it('cat missing file returns UNIX format error', async () => {
    const fs = makeMockFs({
      read: vi.fn().mockResolvedValue({ content: null, error: 'No such file' }),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('cat /no/such/file')).output
    expect(out).toMatch(/^cat: /)
    expect(out).toContain('No such file or directory')
  })
})

describe('DBB-008: error message — mkdir parent missing', () => {
  it('mkdir without -p on missing parent returns error with path', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockRejectedValue(new Error('No such file or directory')),
      mkdir: vi.fn().mockResolvedValue(undefined),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('mkdir /no/parent/dir')).output
    expect(out).toMatch(/mkdir/)
    expect(out).toContain('No such file or directory')
  })
})

describe('DBB-009: error message — rm non-existent', () => {
  it('rm nonexistent returns error with path', async () => {
    const fs = makeMockFs({
      read: vi.fn().mockResolvedValue({ content: null, error: 'No such file' }),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('rm /nonexistent')).output
    expect(out).toContain('/nonexistent')
    expect(out).toMatch(/No such file or directory/i)
  })
})

describe('DBB-010: ls -a shows hidden files', () => {
  it('ls without -a hides dotfiles', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([
        { name: '.hidden', type: 'file' },
        { name: 'visible.txt', type: 'file' },
      ]),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('ls /dir')).output
    expect(out).toContain('visible.txt')
    expect(out).not.toContain('.hidden')
  })

  it('ls -a shows dotfiles', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([
        { name: '.hidden', type: 'file' },
        { name: 'visible.txt', type: 'file' },
      ]),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('ls -a /dir')).output
    expect(out).toContain('.hidden')
    expect(out).toContain('visible.txt')
  })
})

describe('DBB-011: ls -a includes . and ..', () => {
  it('ls -a prepends . and .. entries', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([{ name: 'file.txt', type: 'file' }]),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('ls -a')).output
    // ls renders dirs with trailing slash: './' and '../'
    expect(out).toContain('./')
    expect(out).toContain('../')
  })
})

describe('DBB-015: boundary — empty file', () => {
  it('cat empty file returns empty string', async () => {
    const fs = makeMockFs({
      read: vi.fn().mockResolvedValue({ content: '', error: null }),
    })
    const sh = new AgenticShell(fs)
    expect((await sh.exec('cat empty.txt')).output).toBe('')
  })
})

describe('DBB-016: boundary — special characters in filename', () => {
  it('cat file with space in name returns content', async () => {
    const fs = makeMockFs({
      read: vi.fn().mockResolvedValue({ content: 'hello', error: null }),
    })
    const sh = new AgenticShell(fs)
    expect((await sh.exec('cat "hello world.txt"')).output).toBe('hello')
    expect(fs.read).toHaveBeenCalledWith('/hello world.txt')
  })
})

describe('DBB-017: boundary — path resolution', () => {
  it('cat ./subdir/../file.txt resolves correctly', async () => {
    const fs = makeMockFs({
      read: vi.fn().mockResolvedValue({ content: 'data', error: null }),
    })
    const sh = new AgenticShell(fs)
    await sh.exec('cat ./subdir/../file.txt')
    expect(fs.read).toHaveBeenCalledWith('/file.txt')
  })
})
