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

function fileAwareLs(files: Record<string, string>, dirs: Record<string, Array<{name: string; type: 'file' | 'dir'}>>) {
  return vi.fn().mockImplementation(async (p: string) => {
    if (p in dirs) return dirs[p]
    if (p in files) throw new Error('Not a directory')
    throw new Error('Not a directory')
  })
}

function fileAwareRead(files: Record<string, string>) {
  return vi.fn().mockImplementation(async (p: string) =>
    p in files ? { content: files[p] } : { error: 'No such file or directory' }
  )
}

describe('grep -i m26 edge cases', () => {
  it('grep -ic returns 0 when no matches in multi-file', async () => {
    const files: Record<string, string> = { '/a.txt': 'goodbye', '/b.txt': 'nothing' }
    const fs = makeMockFs({
      ls: fileAwareLs(files, {}),
      read: fileAwareRead(files),
      grep: vi.fn().mockResolvedValue([]),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('grep -ic hello /a.txt /b.txt')
    expect(r.output).toBe('0')
  })

  it('grep -i without -r on directory returns empty or handles gracefully', async () => {
    // Single directory path without -r goes to streaming path first,
    // which reads the directory as a file. The case-insensitive multi-file
    // path at line 576 detects directories when there are multiple paths.
    // With a single dir path, behavior depends on the streaming fallback.
    const dirs: Record<string, Array<{name: string; type: 'file' | 'dir'}>> = {
      '/src': [{ name: 'a.txt', type: 'file' }],
    }
    const files: Record<string, string> = {}
    const fs = makeMockFs({
      ls: vi.fn().mockImplementation(async (p: string) => {
        if (p in dirs) return dirs[p]
        throw new Error('Not a directory')
      }),
      read: vi.fn().mockResolvedValue({ content: '', error: null }),
      grep: vi.fn().mockResolvedValue([]),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('grep -i hello /src')
    // Single path goes to streaming path; directory read returns empty content
    expect(r.output).not.toContain('HELLO')
  })

  it('grep -icr returns 0 when no matches in recursive', async () => {
    const files: Record<string, string> = { '/dir/a.txt': 'goodbye', '/dir/b.txt': 'nothing' }
    const dirs: Record<string, Array<{name: string; type: 'file' | 'dir'}>> = {
      '/dir': [{ name: 'a.txt', type: 'file' }, { name: 'b.txt', type: 'file' }],
    }
    const fs = makeMockFs({
      ls: fileAwareLs(files, dirs),
      read: fileAwareRead(files),
      grep: vi.fn().mockResolvedValue([]),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('grep -icr hello /dir')
    expect(r.output).toBe('0')
  })

  it('grep -ilc returns count (-c checked before -l in code)', async () => {
    const files: Record<string, string> = { '/a.txt': 'HELLO', '/b.txt': 'hello world' }
    const fs = makeMockFs({
      ls: fileAwareLs(files, {}),
      read: fileAwareRead(files),
      grep: vi.fn().mockResolvedValue([]),
    })
    const sh = new AgenticShell(fs)
    // Combined flags -ilc expanded to ['-i','-l','-c']; -c check at line 610 fires first
    const r = await sh.exec('grep -ilc hello /a.txt /b.txt')
    expect(r.output).toBe('2')
  })

  it('grep -i multi-file with mixed match/no-match files', async () => {
    const files: Record<string, string> = { '/a.txt': 'HELLO world', '/b.txt': 'nope', '/c.txt': 'hello there' }
    const fs = makeMockFs({
      ls: fileAwareLs(files, {}),
      read: fileAwareRead(files),
      grep: vi.fn().mockResolvedValue([]),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('grep -il hello /a.txt /b.txt /c.txt')
    expect(r.output).toContain('/a.txt')
    expect(r.output).toContain('/c.txt')
    expect(r.output).not.toContain('/b.txt')
  })

  it('grep -i on file read error skips file gracefully', async () => {
    const readMock = vi.fn()
      .mockResolvedValueOnce({ content: 'HELLO', error: null })
      .mockResolvedValueOnce({ error: 'Permission denied' })
    const lsMock = vi.fn().mockRejectedValue(new Error('not a dir'))
    const fs = makeMockFs({ read: readMock, ls: lsMock })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('grep -i hello /a.txt /b.txt')
    expect(r.output).toContain('HELLO')
  })

  it('grep -i with empty file in multi-file returns empty', async () => {
    const files: Record<string, string> = { '/a.txt': '', '/b.txt': 'HELLO' }
    const fs = makeMockFs({
      ls: fileAwareLs(files, {}),
      read: fileAwareRead(files),
      grep: vi.fn().mockResolvedValue([]),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('grep -i hello /a.txt /b.txt')
    expect(r.output).toContain('HELLO')
  })

  it('grep -ir recursive with nested subdirectories', async () => {
    const files: Record<string, string> = {
      '/root/file1.txt': 'HELLO',
      '/root/sub/file2.txt': 'hello',
      '/root/sub/deep/file3.txt': 'HeLLo',
    }
    const dirs: Record<string, Array<{name: string; type: 'file' | 'dir'}>> = {
      '/root': [{ name: 'file1.txt', type: 'file' }, { name: 'sub', type: 'dir' }],
      '/root/sub': [{ name: 'file2.txt', type: 'file' }, { name: 'deep', type: 'dir' }],
      '/root/sub/deep': [{ name: 'file3.txt', type: 'file' }],
    }
    const fs = makeMockFs({
      ls: fileAwareLs(files, dirs),
      read: fileAwareRead(files),
      grep: vi.fn().mockResolvedValue([]),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('grep -ir hello /root')
    expect(r.output).toContain('file1.txt')
    expect(r.output).toContain('file2.txt')
    expect(r.output).toContain('file3.txt')
  })

  it('grep -i with invalid regex returns error', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockRejectedValue(new Error('not a dir')),
      read: vi.fn().mockResolvedValue({ content: 'hello', error: null }),
      grep: vi.fn().mockResolvedValue([]),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('grep -i "[invalid" /a.txt')
    expect(r.output).toContain('Invalid regular expression')
  })
})
