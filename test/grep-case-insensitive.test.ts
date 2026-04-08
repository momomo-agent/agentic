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

describe('DBB-001: grep -i case-insensitive matching', () => {
  it('matches "Hello", "HELLO", "hello" with pattern "hello"', async () => {
    const fs = makeMockFs({
      read: vi.fn().mockResolvedValue({
        content: 'Hello\nHELLO\nhello\nworld',
        error: null,
      }),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('grep -i "hello" file.txt')).output
    expect(out).toContain('Hello')
    expect(out).toContain('HELLO')
    expect(out).toContain('hello')
    expect(out).not.toContain('world')
  })

  it('matches mixed case patterns', async () => {
    const fs = makeMockFs({
      read: vi.fn().mockResolvedValue({
        content: 'The Quick Brown Fox\nthe quick brown fox\nTHE QUICK BROWN FOX',
        error: null,
      }),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('grep -i "quick" file.txt')).output
    expect(out).toContain('The Quick Brown Fox')
    expect(out).toContain('the quick brown fox')
    expect(out).toContain('THE QUICK BROWN FOX')
  })

  it('without -i flag remains case-sensitive', async () => {
    const fs = makeMockFs({
      read: vi.fn().mockResolvedValue({
        content: 'Hello\nHELLO\nhello\nworld',
        error: null,
      }),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('grep "hello" file.txt')).output
    expect(out).toContain('hello')
    expect(out).not.toContain('Hello')
    expect(out).not.toContain('HELLO')
  })
})

describe('DBB-001: grep -i with pipe stdin mode', () => {
  it('echo "Hello" | grep -i "hello" matches', async () => {
    const sh = new AgenticShell(makeMockFs())
    const out = (await sh.exec('echo Hello | grep -i "hello"')).output
    expect(out).toBe('Hello')
  })

  it('cat file | grep -i matches case-insensitively', async () => {
    const fs = makeMockFs({
      read: vi.fn().mockResolvedValue({
        content: 'Hello World\nGoodbye World\nHELLO AGAIN',
        error: null,
      }),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('cat file.txt | grep -i "hello"')).output
    expect(out).toBe('Hello World\nHELLO AGAIN')
  })

  it('pipe mode without -i is case-sensitive', async () => {
    const fs = makeMockFs({
      read: vi.fn().mockResolvedValue({
        content: 'Hello\nhello\nHELLO',
        error: null,
      }),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('cat file.txt | grep "hello"')).output
    expect(out).toBe('hello')
  })
})

describe('DBB-001: grep -i combined with -l flag', () => {
  it('grep -i -l returns filename when case-insensitive match found', async () => {
    const fs = makeMockFs({
      read: vi.fn().mockResolvedValue({
        content: 'Hello World\nGoodbye',
        error: null,
      }),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('grep -i -l "hello" file.txt')).output
    expect(out).toContain('file.txt')
  })

  it('cat file | grep -i -l returns (stdin) when match found in pipe mode', async () => {
    const fs = makeMockFs({
      read: vi.fn().mockResolvedValue({
        content: 'Hello World',
        error: null,
      }),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('cat file.txt | grep -i -l "hello"')).output
    expect(out).toBe('(stdin)')
  })
})

describe('DBB-001: grep -i combined with -c flag', () => {
  it('grep -i -c counts all case variations', async () => {
    const fs = makeMockFs({
      read: vi.fn().mockResolvedValue({
        content: 'Hello\nHELLO\nhello\nworld\nHeLLo',
        error: null,
      }),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('grep -i -c "hello" file.txt')).output
    expect(out).toContain('4')
  })

  it('cat file | grep -i -c counts matches in pipe', async () => {
    const fs = makeMockFs({
      read: vi.fn().mockResolvedValue({
        content: 'Hello\nHELLO\nhello',
        error: null,
      }),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('cat file.txt | grep -i -c "hello"')).output
    expect(out).toBe('3')
  })
})

describe('DBB-001: grep -i combined with -r flag', () => {
  it('grep -i -r searches recursively with case-insensitive matching', async () => {
    const readMock = vi.fn()
      .mockResolvedValueOnce({ content: 'Hello', error: null })
      .mockResolvedValueOnce({ content: 'HELLO', error: null })
      .mockResolvedValueOnce({ content: 'hello', error: null })
    const lsMock = vi.fn().mockImplementation((path: string) => {
      if (path === '/src') return Promise.resolve([
        { name: 'a.txt', type: 'file' },
        { name: 'b.txt', type: 'file' },
        { name: 'c.txt', type: 'file' },
      ])
      return Promise.reject(new Error('not a dir'))
    })
    const fs = makeMockFs({ read: readMock, ls: lsMock })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('grep -i -r "hello" /src')).output
    expect(out).toContain('/src/a.txt')
    expect(out).toContain('/src/b.txt')
    expect(out).toContain('/src/c.txt')
  })

  it('grep -i -r -l returns filenames with case-insensitive matches', async () => {
    const readMock = vi.fn()
      .mockResolvedValueOnce({ content: 'Hello\nHELLO', error: null })
      .mockResolvedValueOnce({ content: 'hello', error: null })
    const lsMock = vi.fn().mockImplementation((path: string) => {
      if (path === '/src') return Promise.resolve([
        { name: 'a.txt', type: 'file' },
        { name: 'b.txt', type: 'file' },
      ])
      return Promise.reject(new Error('not a dir'))
    })
    const fs = makeMockFs({ read: readMock, ls: lsMock })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('grep -i -r -l "hello" /src')).output
    expect(out).toBe('/src/a.txt\n/src/b.txt')
  })

  it('grep -i -r -c counts matches across files', async () => {
    const readMock = vi.fn()
      .mockResolvedValueOnce({ content: 'Hello', error: null })
      .mockResolvedValueOnce({ content: 'HELLO', error: null })
      .mockResolvedValueOnce({ content: 'hello', error: null })
    const lsMock = vi.fn().mockImplementation((path: string) => {
      if (path === '/src') return Promise.resolve([
        { name: 'a.txt', type: 'file' },
        { name: 'b.txt', type: 'file' },
        { name: 'c.txt', type: 'file' },
      ])
      return Promise.reject(new Error('not a dir'))
    })
    const fs = makeMockFs({ read: readMock, ls: lsMock })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('grep -i -r -c "hello" /src')).output
    expect(out).toBe('3')
  })
})

describe('grep -i edge cases', () => {
  it('handles empty file', async () => {
    const fs = makeMockFs({
      read: vi.fn().mockResolvedValue({ content: '', error: null }),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('grep -i "pattern" file.txt')).output
    expect(out).toMatch(/grep: warning: streaming unavailable/)
  })

  it('handles file with no matches', async () => {
    const fs = makeMockFs({
      read: vi.fn().mockResolvedValue({
        content: 'foo\nbar\nbaz',
        error: null,
      }),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('grep -i "hello" file.txt')).output
    expect(out).toMatch(/grep: warning: streaming unavailable/)
  })

  it('handles special regex characters in pattern', async () => {
    const fs = makeMockFs({
      read: vi.fn().mockResolvedValue({
        content: 'test.file\nTEST.FILE\ntest-file',
        error: null,
      }),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('grep -i "test.file" file.txt')).output
    // . in regex matches any character
    expect(out).toContain('test.file')
    expect(out).toContain('TEST.FILE')
    expect(out).toContain('test-file')
  })

  it('preserves line numbers in output', async () => {
    const fs = makeMockFs({
      read: vi.fn().mockResolvedValue({
        content: 'line1\nHello\nline3\nHELLO\nline5',
        error: null,
      }),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('grep -i "hello" file.txt')).output
    expect(out).toContain(':2:')
    expect(out).toContain(':4:')
  })

  it('handles pattern with uppercase letters', async () => {
    const fs = makeMockFs({
      read: vi.fn().mockResolvedValue({
        content: 'hello\nHello\nHELLO',
        error: null,
      }),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('grep -i "HELLO" file.txt')).output
    expect(out).toContain('hello')
    expect(out).toContain('Hello')
    expect(out).toContain('HELLO')
  })
})

describe('grep -i with streaming (readStream)', () => {
  it('uses readStream when available and applies -i flag', async () => {
    const mockReadStream = async function* (path: string) {
      yield 'Hello World'
      yield 'goodbye world'
      yield 'HELLO AGAIN'
    }

    const fs = makeMockFs({
      readStream: vi.fn().mockImplementation(mockReadStream),
    })

    const sh = new AgenticShell(fs)
    const out = (await sh.exec('grep -i "hello" file.txt')).output
    expect(out).toContain('Hello World')
    expect(out).toContain('HELLO AGAIN')
    expect(out).not.toContain('goodbye world')
  })
})
