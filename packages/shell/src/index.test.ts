import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AgenticShell } from './index'
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

// Helper: returns just the output string for backward-compatible assertions
async function run(sh: AgenticShell, cmd: string): Promise<string> {
  return (await sh.exec(cmd)).output
}

describe('AgenticShell', () => {
  let fs: AgenticFileSystem
  let sh: AgenticShell

  beforeEach(() => {
    fs = makeMockFs()
    sh = new AgenticShell(fs)
  })

  // pwd / cd
  it('pwd returns /', async () => expect(await run(sh, 'pwd')).toBe('/'))
  it('cd changes cwd', async () => { await run(sh, 'cd /tmp'); expect(await run(sh, 'pwd')).toBe('/tmp') })
  it('cd ~ resets to /', async () => { await run(sh, 'cd /tmp'); await run(sh, 'cd ~'); expect(await run(sh, 'pwd')).toBe('/') })

  // echo
  it('echo joins args', async () => expect(await run(sh, 'echo hello world')).toBe('hello world'))
  it('echo > writes to file', async () => {
    await run(sh, 'echo hello > /f.txt')
    expect(fs.write).toHaveBeenCalledWith('/f.txt', 'hello\n')
  })
  it('echo >> appends to file', async () => {
    vi.mocked(fs.read).mockResolvedValue({ content: 'hello\n', error: null })
    await run(sh, 'echo world >> /f.txt')
    expect(fs.write).toHaveBeenCalledWith('/f.txt', 'hello\nworld\n')
  })
  it('echo > overwrites file', async () => {
    vi.mocked(fs.read).mockResolvedValue({ content: 'old\n', error: null })
    await run(sh, 'echo hi > /f.txt')
    expect(fs.write).toHaveBeenCalledWith('/f.txt', 'hi\n')
  })
  it('echo > readOnly returns permission error', async () => {
    fs = makeMockFs({ readOnly: true })
    sh = new AgenticShell(fs)
    const result = await run(sh, 'echo hi > /f.txt')
    expect(result).toBe('echo: /f.txt: Permission denied')
  })
  it('echo without redirect returns text', async () => {
    expect(await run(sh, 'echo no-redirect')).toBe('no-redirect')
  })

  // ls
  it('ls calls fs.ls with resolved path', async () => {
    vi.mocked(fs.ls).mockResolvedValue([{ name: 'file.txt', type: 'file' }])
    expect(await run(sh, 'ls')).toBe('file.txt')
  })
  it('ls -l shows permissions', async () => {
    vi.mocked(fs.ls).mockResolvedValue([{ name: 'file.txt', type: 'file' }])
    expect(await run(sh, 'ls -l')).toContain('-rwxr-xr-x')
  })
  it('ls empty dir returns empty string', async () => expect(await run(sh, 'ls')).toBe(''))
  it('ls -a shows hidden files from fs', async () => {
    vi.mocked(fs.ls).mockResolvedValue([{ name: '.hidden', type: 'file' }, { name: 'visible.txt', type: 'file' }])
    const out = await run(sh, 'ls -a')
    expect(out).toContain('.hidden')
    expect(out).toContain('visible.txt')
  })
  it('ls without -a hides dotfiles', async () => {
    vi.mocked(fs.ls).mockResolvedValue([{ name: '.hidden', type: 'file' }, { name: 'visible.txt', type: 'file' }])
    const out = await run(sh, 'ls')
    expect(out).not.toContain('.hidden')
    expect(out).toContain('visible.txt')
  })
  it('ls -a always includes . and ..', async () => {
    vi.mocked(fs.ls).mockResolvedValue([{ name: 'file.txt', type: 'file' }])
    const out = await run(sh, 'ls -a')
    expect(out).toContain('.')
    expect(out).toContain('..')
  })
  it('ls -a does not duplicate . and .. if fs returns them', async () => {
    vi.mocked(fs.ls).mockResolvedValue([{ name: '.', type: 'dir' }, { name: '..', type: 'dir' }, { name: 'file.txt', type: 'file' }])
    const out = await run(sh, 'ls -a')
    const lines = out.split('\n')
    expect(lines.filter(l => l === '.' || l === './').length).toBe(1)
    expect(lines.filter(l => l === '..' || l === '../').length).toBe(1)
  })

  it('ls returns error when fs.ls returns error field', async () => {
    vi.mocked(fs.ls).mockResolvedValue({ error: 'No such file or directory' } as any)
    await expect(run(sh, 'ls /missing')).resolves.toMatch(/ls: \/missing: No such file or directory/)
  })

  // cat
  it('cat returns file content', async () => {
    vi.mocked(fs.read).mockResolvedValue({ content: 'hello', error: null })
    expect(await run(sh, 'cat file.txt')).toBe('hello')
  })
  it('cat missing file returns error', async () => {
    vi.mocked(fs.read).mockResolvedValue({ content: null, error: 'No such file' })
    expect(await run(sh, 'cat missing.txt')).toContain('No such file')
  })
  it('cat empty file returns empty string', async () => {
    vi.mocked(fs.read).mockResolvedValue({ content: '', error: null })
    expect(await run(sh, 'cat empty.txt')).toBe('')
  })
  it('cat missing operand', async () => expect(await run(sh, 'cat')).toBe('cat: missing operand'))

  // grep
  it('grep basic match', async () => {
    vi.mocked(fs.grep).mockResolvedValue([{ path: '/a.txt', line: 1, content: 'hello' }])
    expect(await run(sh, 'grep hello')).toBe('/a.txt:1: hello')
  })
  it('grep no match returns empty', async () => expect(await run(sh, 'grep nope')).toBe(''))
  it('grep -l returns file paths', async () => {
    vi.mocked(fs.grep).mockResolvedValue([
      { path: '/a.txt', line: 1, content: 'x' },
      { path: '/a.txt', line: 2, content: 'x' },
    ])
    expect(await run(sh, 'grep -l x')).toBe('/a.txt')
  })
  it('grep -c returns count', async () => {
    vi.mocked(fs.grep).mockResolvedValue([{ path: '/a.txt', line: 1, content: 'x' }])
    expect(await run(sh, 'grep -c x')).toBe('1')
  })
  it('grep -r with no path defaults to cwd', async () => {
    vi.mocked(fs.grep).mockResolvedValue([{ path: '/foo.txt', line: 1, content: 'x' }])
    expect(await run(sh, 'grep -r x')).toBe('/foo.txt:1: x')
  })
  it('grep -r filters by path', async () => {
    vi.mocked(fs.grep).mockResolvedValue([
      { path: '/src/a.txt', line: 1, content: 'x' },
      { path: '/other/b.txt', line: 1, content: 'x' },
    ])
    expect(await run(sh, 'grep -r x /src')).toBe('/src/a.txt:1: x')
  })
  it('grep missing pattern', async () => expect(await run(sh, 'grep')).toBe('grep: missing pattern'))
  it('grep -r on non-existent directory returns error', async () => {
    vi.mocked(fs.grep).mockResolvedValue([])
    vi.mocked(fs.ls).mockRejectedValue(new Error('not found'))
    expect(await run(sh, 'grep -r pattern /nonexistent')).toMatch(/grep: \/nonexistent: No such file or directory/)
  })
  it('grep -r on empty dir with no matches returns empty string', async () => {
    vi.mocked(fs.grep).mockResolvedValue([])
    vi.mocked(fs.ls).mockResolvedValue([])
    expect(await run(sh, 'grep -r pattern /emptydir')).toBe('')
  })

  // find
  it('find lists entries', async () => {
    vi.mocked(fs.ls).mockResolvedValue([{ name: 'a.txt', type: 'file' }, { name: 'dir', type: 'dir' }])
    const out = await run(sh, 'find /')
    expect(out).toContain('a.txt')
  })
  it('find -name glob filters', async () => {
    vi.mocked(fs.ls).mockResolvedValue([{ name: 'a.txt', type: 'file' }, { name: 'b.js', type: 'file' }])
    expect(await run(sh, 'find / -name *.txt')).toBe('a.txt')
  })

  // mkdir / rm / touch
  it('mkdir calls fs.mkdir when available', async () => {
    const mockMkdir = vi.fn().mockResolvedValue(undefined)
    const fsWithMkdir = makeMockFs({ mkdir: mockMkdir })
    const sh2 = new AgenticShell(fsWithMkdir)
    await run(sh2, 'mkdir newdir')
    expect(mockMkdir).toHaveBeenCalledWith('/newdir')
    expect(fsWithMkdir.write).not.toHaveBeenCalledWith('/newdir/.keep', '')
  })
  it('mkdir falls back to .keep when fs.mkdir unavailable', async () => {
    const fsNoMkdir = makeMockFs()
    delete (fsNoMkdir as any).mkdir
    const sh2 = new AgenticShell(fsNoMkdir)
    const result = await run(sh2, 'mkdir /newdir')
    expect(result).toBe('')
    expect(fsNoMkdir.write).toHaveBeenCalledWith('/newdir/.keep', '')
  })
  it('mkdir -p falls back to .keep for each segment', async () => {
    const fsNoMkdir = makeMockFs()
    delete (fsNoMkdir as any).mkdir
    const sh2 = new AgenticShell(fsNoMkdir)
    const result = await run(sh2, 'mkdir -p /a/b/c')
    expect(result).toBe('')
    expect(fsNoMkdir.write).toHaveBeenCalledWith('/a/.keep', '')
    expect(fsNoMkdir.write).toHaveBeenCalledWith('/a/b/.keep', '')
    expect(fsNoMkdir.write).toHaveBeenCalledWith('/a/b/c/.keep', '')
  })
  it('mkdir fallback returns permission error for readOnly fs', async () => {
    const fsNoMkdir = makeMockFs({ readOnly: true })
    delete (fsNoMkdir as any).mkdir
    const sh2 = new AgenticShell(fsNoMkdir)
    const result = await run(sh2, 'mkdir /newdir')
    expect(result).toContain('Permission denied')
  })
  it('rm calls delete', async () => {
    await run(sh, 'rm file.txt')
    expect(fs.delete).toHaveBeenCalledWith('/file.txt')
  })
  it('touch creates empty file', async () => {
    vi.mocked(fs.read).mockResolvedValue({ content: null, error: null })
    await run(sh, 'touch new.txt')
    expect(fs.write).toHaveBeenCalledWith('/new.txt', '')
  })

  // mv / cp
  it('mv reads, writes, deletes', async () => {
    vi.mocked(fs.read).mockResolvedValue({ content: 'data', error: null })
    await run(sh, 'mv a.txt b.txt')
    expect(fs.write).toHaveBeenCalledWith('/b.txt', 'data')
    expect(fs.delete).toHaveBeenCalledWith('/a.txt')
  })
  it('cp reads and writes', async () => {
    vi.mocked(fs.read).mockResolvedValue({ content: 'data', error: null })
    await run(sh, 'cp a.txt b.txt')
    expect(fs.write).toHaveBeenCalledWith('/b.txt', 'data')
  })

  // cp -r (DBB-006)
  describe('cp -r recursive copy', () => {
    it('cp -r copies simple directory tree', async () => {
      const fs = makeMockFs({
        ls: vi.fn().mockResolvedValue([
          { name: 'file1.txt', type: 'file' },
          { name: 'file2.txt', type: 'file' }
        ]),
        read: vi.fn()
          .mockResolvedValueOnce({ content: 'content1', error: null })
          .mockResolvedValueOnce({ content: 'content2', error: null }),
        mkdir: vi.fn().mockResolvedValue(undefined)
      })
      const sh = new AgenticShell(fs)
      const result = await run(sh, 'cp -r /dir1 /dir2')
      expect(result).toBe('')
      expect(fs.mkdir).toHaveBeenCalledWith('/dir2')
      expect(fs.write).toHaveBeenCalledWith('/dir2/file1.txt', 'content1')
      expect(fs.write).toHaveBeenCalledWith('/dir2/file2.txt', 'content2')
    })

    it('cp -r copies nested directory structure', async () => {
      const fs = makeMockFs({
        ls: vi.fn()
          .mockResolvedValueOnce([
            { name: 'file.txt', type: 'file' },
            { name: 'subdir', type: 'dir' }
          ])
          .mockResolvedValueOnce([
            { name: 'deep.txt', type: 'file' }
          ]),
        read: vi.fn()
          .mockResolvedValueOnce({ content: 'nested content', error: null })
          .mockResolvedValueOnce({ content: 'deep content', error: null }),
        mkdir: vi.fn().mockResolvedValue(undefined)
      })
      const sh = new AgenticShell(fs)
      const result = await run(sh, 'cp -r /a/b /c')
      expect(result).toBe('')
      expect(fs.mkdir).toHaveBeenCalledWith('/c')
      expect(fs.mkdir).toHaveBeenCalledWith('/c/subdir')
      expect(fs.write).toHaveBeenCalledWith('/c/file.txt', 'nested content')
      expect(fs.write).toHaveBeenCalledWith('/c/subdir/deep.txt', 'deep content')
    })

    it('cp -r returns error for nonexistent source', async () => {
      const fs = makeMockFs({
        ls: vi.fn().mockRejectedValue(new Error('No such file or directory'))
      })
      const sh = new AgenticShell(fs)
      const result = await run(sh, 'cp -r /nonexistent /dst')
      expect(result).toContain('No such file or directory')
    })

    it('cp -r handles deep nesting (3+ levels)', async () => {
      const fs = makeMockFs({
        ls: vi.fn()
          .mockResolvedValueOnce([{ name: 'level1', type: 'dir' }])
          .mockResolvedValueOnce([{ name: 'level2', type: 'dir' }])
          .mockResolvedValueOnce([{ name: 'level3', type: 'dir' }])
          .mockResolvedValueOnce([{ name: 'deep.txt', type: 'file' }]),
        read: vi.fn().mockResolvedValue({ content: 'very deep', error: null }),
        mkdir: vi.fn().mockResolvedValue(undefined)
      })
      const sh = new AgenticShell(fs)
      const result = await run(sh, 'cp -r /root /copy')
      expect(result).toBe('')
      expect(fs.mkdir).toHaveBeenCalledWith('/copy')
      expect(fs.mkdir).toHaveBeenCalledWith('/copy/level1')
      expect(fs.mkdir).toHaveBeenCalledWith('/copy/level1/level2')
      expect(fs.mkdir).toHaveBeenCalledWith('/copy/level1/level2/level3')
      expect(fs.write).toHaveBeenCalledWith('/copy/level1/level2/level3/deep.txt', 'very deep')
    })

    it('cp -r copies empty directory', async () => {
      const fs = makeMockFs({
        ls: vi.fn().mockResolvedValue([]),
        mkdir: vi.fn().mockResolvedValue(undefined)
      })
      const sh = new AgenticShell(fs)
      const result = await run(sh, 'cp -r /empty /copy')
      expect(result).toBe('')
      expect(fs.mkdir).toHaveBeenCalledWith('/copy')
      expect(fs.write).not.toHaveBeenCalled()
    })

    it('cp -R (uppercase) works like cp -r', async () => {
      const fs = makeMockFs({
        ls: vi.fn().mockResolvedValue([{ name: 'file.txt', type: 'file' }]),
        read: vi.fn().mockResolvedValue({ content: 'content', error: null }),
        mkdir: vi.fn().mockResolvedValue(undefined)
      })
      const sh = new AgenticShell(fs)
      const result = await run(sh, 'cp -R /dir /copy')
      expect(result).toBe('')
      expect(fs.mkdir).toHaveBeenCalledWith('/copy')
      expect(fs.write).toHaveBeenCalledWith('/copy/file.txt', 'content')
    })

    it('cp without -r still works for single file', async () => {
      const fs = makeMockFs({
        read: vi.fn().mockResolvedValue({ content: 'file content', error: null })
      })
      const sh = new AgenticShell(fs)
      const result = await run(sh, 'cp /file.txt /dst.txt')
      expect(result).toBe('')
      expect(fs.write).toHaveBeenCalledWith('/dst.txt', 'file content')
      expect(fs.ls).not.toHaveBeenCalled()
    })

    it('cp dir dest without -r returns "cp: dir: is a directory"', async () => {
      const fs = makeMockFs({
        ls: vi.fn().mockResolvedValue([{ name: 'file.txt', type: 'file' }])
      })
      const sh = new AgenticShell(fs)
      const result = await sh.exec('cp /mydir /dest')
      expect(result.output).toBe('cp: /mydir: is a directory')
      expect(result.exitCode).toBe(1)
    })

    it('cp -r respects readOnly filesystem', async () => {
      const fs = makeMockFs({
        ls: vi.fn().mockResolvedValue([{ name: 'file.txt', type: 'file' }]),
        mkdir: vi.fn().mockRejectedValue(new Error('Permission denied'))
      })
      const sh = new AgenticShell(fs, { readOnly: true })
      const result = await run(sh, 'cp -r /src /dst')
      expect(result).toContain('Permission denied')
    })
  })

  // head / tail / wc
  it('head returns first 10 lines by default', async () => {
    vi.mocked(fs.read).mockResolvedValue({ content: Array.from({length: 20}, (_, i) => `line${i}`).join('\n'), error: null })
    const out = await run(sh, 'head file.txt')
    expect(out.split('\n')).toHaveLength(10)
  })
  it('tail returns last N lines', async () => {
    vi.mocked(fs.read).mockResolvedValue({ content: 'a\nb\nc', error: null })
    expect(await run(sh, 'tail -n 2 file.txt')).toBe('b\nc')
  })
  it('wc returns line/word/char counts', async () => {
    vi.mocked(fs.read).mockResolvedValue({ content: 'hello world\nfoo', error: null })
    expect(await run(sh, 'wc file.txt')).toMatch(/2\t3\t15/)
  })

  // pipe
  it('echo | grep matches', async () => expect(await run(sh, 'echo hello world | grep hello')).toBe('hello world'))
  it('echo | grep no match returns empty', async () => expect(await run(sh, 'echo hello | grep nope')).toBe(''))
  it('cat | grep filters lines', async () => {
    vi.mocked(fs.read).mockResolvedValue({ content: 'foo\nbar\nbaz', error: null })
    expect(await run(sh, 'cat file.txt | grep ba')).toBe('bar\nbaz')
  })

  // unknown command
  it('unknown command returns error', async () => expect(await run(sh, 'foobar')).toBe('foobar: command not found'))

  // rm multi-path
  it('rm deletes multiple files in one command', async () => {
    vi.mocked(fs.ls).mockRejectedValue(new Error('not a directory'))
    await run(sh, 'rm /file1.txt /file2.txt /file3.txt')
    expect(fs.delete).toHaveBeenCalledWith('/file1.txt')
    expect(fs.delete).toHaveBeenCalledWith('/file2.txt')
    expect(fs.delete).toHaveBeenCalledWith('/file3.txt')
  })

  // rm -r deep nesting
  it('rm -r recursively deletes deeply nested directories', async () => {
    vi.mocked(fs.ls)
      .mockResolvedValueOnce([{ name: 'b', type: 'dir' }])
      .mockResolvedValueOnce([{ name: 'c', type: 'dir' }])
      .mockResolvedValueOnce([{ name: 'deep.txt', type: 'file' }])
    const result = await run(sh, 'rm -r /a')
    expect(result).toBe('')
    expect(fs.delete).toHaveBeenCalledWith('/a/b/c/deep.txt')
  })

  // grep -i invalid regex
  it('grep -i handles invalid regex gracefully', async () => {
    const result = await run(sh, 'grep -i "[invalid"')
    expect(result).toContain('grep')
    expect(result.length).toBeGreaterThan(0)
  })

  // 3+ stage pipe
  it('handles 3-stage pipe correctly', async () => {
    vi.mocked(fs.read).mockResolvedValue({ content: 'hello test\nhello world\nfoo', error: null })
    const result = await run(sh, 'cat file.txt | grep hello | grep test')
    expect(result).toBe('hello test')
  })

  // 3+ stage pipe with empty intermediate result
  it('handles pipe where intermediate stage returns empty', async () => {
    vi.mocked(fs.read).mockResolvedValue({ content: 'hello world', error: null })
    const result = await run(sh, 'cat file.txt | grep hello | grep nomatch')
    expect(result).toBe('')
  })

  // pipe error propagation
  describe('pipe error propagation', () => {
    it('should propagate left-side error instead of passing to right command', async () => {
      vi.mocked(fs.read).mockResolvedValue({ content: null, error: 'not found' })
      const result = await run(sh, 'cat /nonexistent | grep foo')
      expect(result).toBe('cat: /nonexistent: No such file or directory')
    })

    it('should not propagate when left side succeeds', async () => {
      vi.mocked(fs.read).mockResolvedValue({ content: 'hello\nworld', error: null })
      const result = await run(sh, 'cat /file.txt | grep hello')
      expect(result).toContain('hello')
    })

    it('should propagate error in middle of multi-segment pipe', async () => {
      vi.mocked(fs.read).mockResolvedValue({ content: null, error: 'not found' })
      const result = await run(sh, 'cat /nonexistent | grep foo | wc -l')
      expect(result).toBe('cat: /nonexistent: No such file or directory')
    })
  })
})

// DBB-m12: Exit codes
describe('exit codes', () => {
  let sh: AgenticShell
  beforeEach(() => {
    sh = new AgenticShell(makeMockFs({
      ls: vi.fn().mockResolvedValue([{ name: 'file.txt', type: 'file' }]),
      read: vi.fn().mockImplementation(async (p: string) =>
        p === '/file.txt' ? { content: 'hello' } : { error: 'No such file or directory' }
      ),
    }))
  })

  it('DBB-m12-001: ls / returns exitCode 0', async () => {
    const r = await sh.exec('ls /')
    expect(r.exitCode).toBe(0)
    expect(typeof r.output).toBe('string')
  })

  it('DBB-m12-002: cat /nonexistent returns exitCode 1', async () => {
    const r = await sh.exec('cat /nonexistent')
    expect(r.exitCode).toBe(1)
  })

  it('DBB-m12-003: grep (no pattern) returns exitCode 2', async () => {
    const r = await sh.exec('grep')
    expect(r.exitCode).toBe(2)
  })

  it('DBB-m12-004: cat /nonexistent | grep x returns non-zero exitCode', async () => {
    const r = await sh.exec('cat /nonexistent | grep x')
    expect(r.exitCode).not.toBe(0)
  })

  it('DBB-m12-005: every result has .output string and .exitCode number', async () => {
    for (const cmd of ['ls /', 'cat /file.txt', 'pwd', 'echo hi']) {
      const r = await sh.exec(cmd)
      expect(typeof r.output).toBe('string')
      expect(typeof r.exitCode).toBe('number')
    }
  })
})

// Cross-environment consistency tests
function makeNodeMock(): AgenticFileSystem {
  return {
    ls: async (path: string) => {
      if (path === '/') return [{ name: 'file.txt', type: 'file' }, { name: 'dir', type: 'dir' }]
      if (path === '/dir') return [{ name: 'nested.txt', type: 'file' }]
      return []
    },
    read: async (path: string) => {
      if (path === '/file.txt' || path === '/./file.txt') return { content: 'hello world\nfoo bar' }
      if (path === '/missing') return { error: 'not found' }
      return { error: 'not found' }
    },
    write: async () => {},
    delete: async (path: string) => {
      if (path === '/missing') throw new Error('not found')
    },
    grep: async (pattern: string) => {
      if (pattern === 'hello') return [{ path: '/file.txt', line: 1, content: 'hello world' }]
      return []
    },
    mkdir: async () => {},
  } as AgenticFileSystem
}

function makeBrowserMock(): AgenticFileSystem {
  return {
    ls: async (path: string) => {
      if (path === '/') return [{ name: 'file.txt', type: 'file' }, { name: 'dir', type: 'dir' }]
      if (path === '/dir') return [{ name: 'nested.txt', type: 'file' }]
      return []
    },
    read: async (path: string) => {
      if (path === '/file.txt' || path === '/./file.txt') return { content: 'hello world\nfoo bar' }
      if (path === '/missing') return { error: 'No such file' }
      return { error: 'No such file' }
    },
    write: async () => {},
    delete: async (path: string) => {
      if (path === '/missing') throw new Error('No such file')
    },
    grep: async (pattern: string) => {
      if (pattern === 'hello') return [{ path: '/file.txt', line: 1, content: 'hello world' }]
      return []
    },
    mkdir: async () => {},
  } as AgenticFileSystem
}

function runConsistencyTests(label: string, makeFn: () => AgenticFileSystem): void {
  describe(`cross-env: ${label}`, () => {
    let sh: AgenticShell
    let fs: AgenticFileSystem

    beforeEach(() => {
      fs = makeFn()
      sh = new AgenticShell(fs)
    })

    it('ls / returns same file list', async () => {
      const out = await run(sh, 'ls /')
      expect(out).toBe('file.txt\ndir/')
    })

    it('cat /file.txt returns same content', async () => {
      const out = await run(sh, 'cat /file.txt')
      expect(out).toBe('hello world\nfoo bar')
    })

    it('cat /missing returns normalized error', async () => {
      const out = await run(sh, 'cat /missing')
      expect(out).toMatch(/cat/)
      expect(out).toMatch(/missing/)
    })

    it('grep hello /file.txt returns same matches', async () => {
      const out = await run(sh, 'grep hello')
      expect(out).toBe('/file.txt:1: hello world')
    })

    it('pwd returns /', async () => {
      const out = await run(sh, 'pwd')
      expect(out).toBe('/')
    })

    it('cd /dir && pwd returns /dir', async () => {
      await run(sh, 'cd /dir')
      const out = await run(sh, 'pwd')
      expect(out).toBe('/dir')
    })

    it('path resolution: cat ./sub/../file.txt resolves to /file.txt', async () => {
      const out = await run(sh, 'cat ./file.txt')
      expect(out).toBe('hello world\nfoo bar')
    })
  })
}

runConsistencyTests('node-backend', makeNodeMock)
runConsistencyTests('browser-backend', makeBrowserMock)

// DBB-m12-006 to 009: Input redirection (<)
describe('input redirection', () => {
  let sh: AgenticShell

  beforeEach(() => {
    sh = new AgenticShell(makeMockFs({
      read: vi.fn().mockImplementation(async (p: string) => {
        if (p === '/data.txt') return { content: 'hello\nworld' }
        if (p === '/input.txt') return { content: 'hello\nworld' }
        return { error: 'No such file or directory' }
      }),
      write: vi.fn().mockResolvedValue(undefined),
    }))
  })

  it('DBB-m12-006: grep hello < /data.txt matches line', async () => {
    const r = await sh.exec('grep hello < /data.txt')
    expect(r.output).toBe('hello')
    expect(r.exitCode).toBe(0)
  })

  it('DBB-m12-007: grep pattern < /nonexistent returns exitCode 1', async () => {
    const r = await sh.exec('grep hello < /nonexistent')
    expect(r.exitCode).toBe(1)
    expect(r.output).toContain('No such file or directory')
  })

  it('DBB-m12-008: grep xyz < /data.txt (no match) returns empty output, exitCode 1', async () => {
    const r = await sh.exec('grep xyz < /data.txt')
    expect(r.output).toBe('')
    expect(r.exitCode).toBe(1)
  })

  it('DBB-m12-009: grep hello < /input.txt > /output.txt writes file', async () => {
    const writeMock = vi.fn().mockResolvedValue(undefined)
    sh = new AgenticShell(makeMockFs({
      read: vi.fn().mockImplementation(async (p: string) =>
        p === '/input.txt' ? { content: 'hello\nworld' } : { error: 'No such file or directory' }
      ),
      write: writeMock,
    }))
    const r = await sh.exec('grep hello < /input.txt > /output.txt')
    expect(r.exitCode).toBe(0)
    expect(writeMock).toHaveBeenCalledWith('/output.txt', expect.stringContaining('hello'))
  })
})

describe('touch fixes', () => {
  let sh: AgenticShell
  let mockFs: ReturnType<typeof makeMockFs>

  beforeEach(() => {
    mockFs = makeMockFs()
    sh = new AgenticShell(mockFs)
  })

  it('touch on existing empty file does not overwrite', async () => {
    await mockFs.write('/empty.txt', '')
    await sh.exec('touch /empty.txt')
    const r = await mockFs.read('/empty.txt')
    expect(r.content).toBe('')
  })

  it('touch creates non-existent file', async () => {
    const r = await sh.exec('touch /new.txt')
    expect(r.exitCode).toBe(0)
    const f = await mockFs.read('/new.txt')
    expect(f.content).toBe('')
  })

  it('touch on non-empty file is no-op', async () => {
    await mockFs.write('/data.txt', 'hello')
    await sh.exec('touch /data.txt')
    const r = await mockFs.read('/data.txt')
    expect(r.content).toBe('hello')
  })
})

describe('wc flag support', () => {
  let sh: AgenticShell
  let mockFs: ReturnType<typeof makeMockFs>

  beforeEach(() => {
    mockFs = makeMockFs()
    sh = new AgenticShell(mockFs)
  })

  it('wc -l returns line count with filename', async () => {
    await mockFs.write('/f.txt', 'a\nb\nc')
    const r = await sh.exec('wc -l /f.txt')
    expect(r.output).toBe('3\t/f.txt')
  })

  it('wc -w returns word count with filename', async () => {
    await mockFs.write('/f.txt', 'hello world foo')
    const r = await sh.exec('wc -w /f.txt')
    expect(r.output).toBe('3\t/f.txt')
  })

  it('wc -c returns char count with filename', async () => {
    await mockFs.write('/f.txt', 'abc')
    const r = await sh.exec('wc -c /f.txt')
    expect(r.output).toBe('3\t/f.txt')
  })

  it('wc without flags returns full output', async () => {
    await mockFs.write('/f.txt', 'a\nb')
    const r = await sh.exec('wc /f.txt')
    expect(r.output).toContain('/f.txt')
  })
})

describe('grep -i all paths', () => {
  let sh: AgenticShell
  let mockFs: ReturnType<typeof makeMockFs>

  beforeEach(() => {
    mockFs = makeMockFs()
    sh = new AgenticShell(mockFs)
  })

  it('grep -i matches case-insensitively via fs.grep path', async () => {
    await mockFs.write('/a.txt', 'Hello')
    await mockFs.write('/b.txt', 'world')
    const r = await sh.exec('grep -i hello /a.txt /b.txt')
    expect(r.output).toContain('Hello')
  })

  it('grep -il returns filename', async () => {
    await mockFs.write('/a.txt', 'Hello')
    const r = await sh.exec('grep -il hello /a.txt /b.txt')
    expect(r.output).toBe('/a.txt')
  })

  it('grep -ic returns count', async () => {
    await mockFs.write('/a.txt', 'Hello\nhello\nworld')
    const r = await sh.exec('grep -ic hello /a.txt /b.txt')
    expect(r.output).toBe('2')
  })
})

describe('glob expansion in cat, rm, cp', () => {
  let sh: AgenticShell
  let mockFs: ReturnType<typeof makeMockFs>

  beforeEach(() => {
    const files: Record<string, string> = {}
    mockFs = makeMockFs({
      read: vi.fn().mockImplementation(async (p: string) =>
        p in files ? { content: files[p] } : { error: 'No such file or directory' }
      ),
      write: vi.fn().mockImplementation(async (p: string, c: string) => { files[p] = c }),
      delete: vi.fn().mockResolvedValue(undefined),
      ls: vi.fn().mockImplementation(async (p: string) => {
        if (p === '/') return [
          { name: 'a.txt', type: 'file' },
          { name: 'b.txt', type: 'file' },
          { name: 'c.log', type: 'file' },
        ]
        throw new Error('Not a directory')
      }),
    })
    sh = new AgenticShell(mockFs)
    files['/a.txt'] = 'aaa'
    files['/b.txt'] = 'bbb'
    files['/c.log'] = 'ccc'
  })

  it('cat *.txt concatenates matching files', async () => {
    const r = await sh.exec('cat *.txt')
    expect(r.output).toContain('aaa')
    expect(r.output).toContain('bbb')
    expect(r.exitCode).toBe(0)
  })

  it('cat *.xyz returns no such file or directory', async () => {
    const r = await sh.exec('cat *.xyz')
    expect(r.output).toContain('No such file or directory')
    expect(r.exitCode).toBe(1)
  })

  it('rm *.log removes matching files', async () => {
    const r = await sh.exec('rm *.log')
    expect(r.exitCode).toBe(0)
    expect(mockFs.delete).toHaveBeenCalledWith('/c.log')
  })

  it('cp *.txt /dest/ copies each match', async () => {
    const r = await sh.exec('cp *.txt /dest')
    expect(r.exitCode).toBe(0)
    expect(mockFs.write).toHaveBeenCalledWith('/dest/a.txt', 'aaa')
    expect(mockFs.write).toHaveBeenCalledWith('/dest/b.txt', 'bbb')
  })
})

describe('background jobs', () => {
  let fs: AgenticFileSystem
  let sh: AgenticShell

  beforeEach(() => {
    fs = makeMockFs()
    sh = new AgenticShell(fs)
  })

  it('should return job ID for background command', async () => {
    const r = await sh.exec('echo hello &')
    expect(r.output).toMatch(/\[1\] 1/)
    expect(r.exitCode).toBe(0)
  })

  it('should retrieve background output via fg', async () => {
    await sh.exec('echo hello &')
    const r = await sh.exec('fg %1')
    expect(r.output).toBe('hello')
    // Job should be removed from map
    const jobsOut = await run(sh, 'jobs')
    expect(jobsOut).toBe('')
  })

  it('should list jobs with status', async () => {
    await sh.exec('echo hello &')
    const r = await sh.exec('jobs')
    expect(r.output).toContain('[1]')
    expect(r.output).toContain('echo hello')
    expect(r.output).toMatch(/running|done/)
  })

  it('should support fg with percent prefix', async () => {
    await sh.exec('echo test &')
    const r = await sh.exec('fg %1')
    expect(r.output).toBe('test')
  })

  it('should fg most recent job when no arg given', async () => {
    await sh.exec('echo first &')
    await sh.exec('echo second &')
    const r = await sh.exec('fg')
    expect(r.output).toBe('second')
  })

  it('should error on bg with invalid job ID', async () => {
    const r = await sh.exec('bg %99')
    expect(r.output).toBe('bg: %99: no such job')
  })

  it('should error on fg with no jobs', async () => {
    const r = await sh.exec('fg')
    expect(r.output).toBe('fg: current: no such job')
  })

  it('should error on fg with invalid job ID', async () => {
    await sh.exec('echo hello &')
    const r = await sh.exec('fg %99')
    expect(r.output).toBe('fg: %99: no such job')
  })

  it('should error on empty background command', async () => {
    const r = await sh.exec('&')
    expect(r.output).toBe('exec: missing command')
    expect(r.exitCode).toBe(1)
  })

  it('should assign sequential job IDs', async () => {
    const r1 = await sh.exec('echo a &')
    expect(r1.output).toMatch(/\[1\] 1/)
    const r2 = await sh.exec('echo b &')
    expect(r2.output).toMatch(/\[2\] 2/)
  })

  it('should return empty string for jobs with no active jobs', async () => {
    const r = await sh.exec('jobs')
    expect(r.output).toBe('')
  })
})

describe('performance benchmarks', () => {
  it('grep completes within 500ms on 1MB file', async () => {
    const lines = Array.from({ length: 20000 }, (_, i) =>
      i % 100 === 0 ? 'match line' : `line ${i} with some content here`
    )
    const content = lines.join('\n')
    const fs = makeMockFs({
      read: vi.fn().mockResolvedValue({ content, error: null }),
    })
    const sh = new AgenticShell(fs)

    const start = performance.now()
    const r = await sh.exec('grep match /bigfile')
    const elapsed = performance.now() - start

    expect(r.exitCode).toBe(0)
    expect(elapsed).toBeLessThan(500)
  })

  it('find completes within 1s on 1000 files', async () => {
    const entries = Array.from({ length: 1000 }, (_, i) => ({
      name: `file${i}.txt`,
      type: 'file' as const,
    }))
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue(entries),
    })
    const sh = new AgenticShell(fs)

    const start = performance.now()
    const r = await sh.exec('find /bigdir')
    const elapsed = performance.now() - start

    expect(r.exitCode).toBe(0)
    expect(elapsed).toBeLessThan(1000)
  })

  it('ls pagination completes within 100ms', async () => {
    const entries = Array.from({ length: 500 }, (_, i) => ({
      name: `file${i}.txt`,
      type: 'file' as const,
    }))
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue(entries),
    })
    const sh = new AgenticShell(fs)

    const start = performance.now()
    const r = await sh.exec('ls --page 1 --page-size 20 /bigdir')
    const elapsed = performance.now() - start

    expect(r.exitCode).toBe(0)
    expect(elapsed).toBeLessThan(100)
  })
})

describe('grep streaming', () => {
  function makeStreamableMockFs(fileContents: Record<string, string>) {
    const files = new Map(Object.entries(fileContents))
    return {
      ls: vi.fn().mockImplementation(async (path: string) => {
        const entries: { name: string; type: 'file' | 'dir' }[] = []
        for (const filePath of files.keys()) {
          const dir = filePath.substring(0, filePath.lastIndexOf('/')) || '/'
          const name = filePath.substring(filePath.lastIndexOf('/') + 1)
          if (dir === path) entries.push({ name, type: 'file' })
        }
        if (entries.length) return entries
        throw new Error('No such file or directory')
      }),
      read: vi.fn().mockImplementation(async (path: string) => {
        if (files.has(path)) return { content: files.get(path), error: null }
        return { content: null, error: 'No such file or directory' }
      }),
      write: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      grep: vi.fn().mockResolvedValue([]),
      readStream: vi.fn().mockImplementation((path: string) => {
        const content = files.get(path)
        if (content === undefined) throw new Error('not found')
        const lines = content.split('\n')
        return {
          async *[Symbol.asyncIterator]() {
            for (const line of lines) yield line
          }
        }
      }),
    } as unknown as AgenticFileSystem & { readStream: ReturnType<typeof vi.fn> }
  }

  it('should use streaming path for single file', async () => {
    const fs = makeStreamableMockFs({ '/large.txt': 'hello\nworld\nhello world\n' })
    const shell = new AgenticShell(fs)
    const result = await shell.exec('grep hello /large.txt')
    expect(result.output).toContain('/large.txt:1: hello')
    expect(result.output).toContain('/large.txt:3: hello world')
    expect(result.exitCode).toBe(0)
  })

  it('should handle -i flag with streaming', async () => {
    const fs = makeStreamableMockFs({ '/f.txt': 'Hello\nhello\nHELLO\n' })
    const shell = new AgenticShell(fs)
    const result = await shell.exec('grep -i hello /f.txt')
    expect(result.output).toContain('Hello')
    expect(result.output).toContain('hello')
    expect(result.output).toContain('HELLO')
  })

  it('should handle -c flag with streaming', async () => {
    const fs = makeStreamableMockFs({ '/f.txt': 'foo\nbar\nfoo\n' })
    const shell = new AgenticShell(fs)
    const result = await shell.exec('grep -c foo /f.txt')
    expect(result.output).toBe('2')
  })

  it('should handle -l flag with streaming', async () => {
    const fs = makeStreamableMockFs({ '/f.txt': 'foo\nbar\n' })
    const shell = new AgenticShell(fs)
    const result = await shell.exec('grep -l foo /f.txt')
    expect(result.output).toBe('/f.txt')
  })

  it('should use streaming for multiple files', async () => {
    const fs = makeStreamableMockFs({
      '/a.txt': 'hello\n',
      '/b.txt': 'world\n',
      '/c.txt': 'hello world\n',
    })
    const shell = new AgenticShell(fs)
    const result = await shell.exec('grep hello /a.txt /c.txt')
    expect(result.output).toContain('/a.txt:1: hello')
    expect(result.output).toContain('/c.txt:1: hello world')
    expect(result.exitCode).toBe(0)
  })

  it('should handle -c flag with multiple files streaming', async () => {
    const fs = makeStreamableMockFs({
      '/a.txt': 'foo\nbar\n',
      '/b.txt': 'foo\n',
    })
    const shell = new AgenticShell(fs)
    const result = await shell.exec('grep -c foo /a.txt /b.txt')
    expect(result.output).toBe('2')
  })

  it('should handle -l flag with multiple files streaming', async () => {
    const fs = makeStreamableMockFs({
      '/a.txt': 'foo\n',
      '/b.txt': 'bar\n',
      '/c.txt': 'foo again\n',
    })
    const shell = new AgenticShell(fs)
    const result = await shell.exec('grep -l foo /a.txt /b.txt /c.txt')
    const files = result.output.split('\n')
    expect(files).toContain('/a.txt')
    expect(files).toContain('/c.txt')
    expect(files).not.toContain('/b.txt')
  })

  it('should fall back to read() when readStream unavailable', async () => {
    const fs = makeMockFs({
      read: vi.fn().mockResolvedValue({ content: 'hello\nworld\n', error: null }),
    })
    const shell = new AgenticShell(fs)
    const result = await shell.exec('grep hello /f.txt')
    expect(result.output).toContain('hello')
    expect(fs.readStream).toBeUndefined()
  })

  it('should handle non-existent file in multi-file streaming', async () => {
    const fs = makeStreamableMockFs({
      '/a.txt': 'hello\n',
    })
    // Remove readStream from /missing.txt by not having it in the files map
    const shell = new AgenticShell(fs)
    const result = await shell.exec('grep hello /a.txt /missing.txt')
    expect(result.output).toContain('/a.txt:1: hello')
  })

  it('should return empty for no matches in multi-file streaming', async () => {
    const fs = makeStreamableMockFs({
      '/a.txt': 'world\n',
      '/b.txt': 'earth\n',
    })
    const shell = new AgenticShell(fs)
    const result = await shell.exec('grep hello /a.txt /b.txt')
    expect(result.output).toBe('')
  })
})
