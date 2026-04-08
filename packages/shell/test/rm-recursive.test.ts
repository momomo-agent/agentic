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

// DBB-001: rm -r deletes directory recursively
describe('DBB-001: rm -r recursive delete', () => {
  it('deletes nested files and directory', async () => {
    const mockFs = makeMockFs({
      ls: vi.fn().mockImplementation((path: string) => {
        if (path === '/tmp/dir') return Promise.resolve([
          { name: 'file.txt', type: 'file' },
          { name: 'sub', type: 'dir' },
        ])
        if (path === '/tmp/dir/sub') return Promise.resolve([
          { name: 'nested.txt', type: 'file' },
        ])
        return Promise.resolve([])
      }),
    })
    const sh = new AgenticShell(mockFs)
    const out = (await sh.exec('rm -r /tmp/dir')).output
    expect(out).toBe('')
    expect(mockFs.delete).toHaveBeenCalledWith('/tmp/dir/file.txt')
    expect(mockFs.delete).toHaveBeenCalledWith('/tmp/dir/sub/nested.txt')
    expect(mockFs.delete).toHaveBeenCalledWith('/tmp/dir/sub')
    expect(mockFs.delete).toHaveBeenCalledWith('/tmp/dir')
  })
})

// DBB-002: rm -r safety — refuses root
describe('DBB-002: rm -r refuses root', () => {
  it('returns error and does not delete', async () => {
    const mockFs = makeMockFs()
    const sh = new AgenticShell(mockFs)
    const out = (await sh.exec('rm -r /')).output
    expect(out).toBe("rm: refusing to remove '/'")
    expect(mockFs.delete).not.toHaveBeenCalled()
  })
})

// DBB-003: rm without -r on directory
describe('DBB-003: rm without -r on directory', () => {
  it('returns is a directory error', async () => {
    const mockFs = makeMockFs({
      ls: vi.fn().mockResolvedValue([{ name: 'file.txt', type: 'file' }]),
    })
    const sh = new AgenticShell(mockFs)
    const out = (await sh.exec('rm /tmp/dir')).output
    expect(out).toBe('rm: /tmp/dir: is a directory')
    expect(mockFs.delete).not.toHaveBeenCalled()
  })
})

// rm on nonexistent file — ls throws, so delete is called
describe('rm nonexistent file', () => {
  it('returns No such file or directory', async () => {
    const mockFs = makeMockFs({
      ls: vi.fn().mockRejectedValue(new Error('No such file or directory')),
      delete: vi.fn().mockRejectedValue(new Error('No such file or directory')),
    })
    const sh = new AgenticShell(mockFs)
    const out = (await sh.exec('rm /nonexistent')).output
    expect(out).toContain('/nonexistent')
    expect(out).toMatch(/No such file or directory/i)
  })
})

// rm -r on empty directory
describe('rm -r empty directory', () => {
  it('deletes the directory itself', async () => {
    const mockFs = makeMockFs({
      ls: vi.fn().mockResolvedValue([]),
    })
    const sh = new AgenticShell(mockFs)
    const out = (await sh.exec('rm -r /emptydir')).output
    expect(out).toBe('')
    expect(mockFs.delete).toHaveBeenCalledWith('/emptydir')
  })
})

// rm -rf alias works same as rm -r
describe('rm -rf alias', () => {
  it('recursively deletes like rm -r', async () => {
    const mockFs = makeMockFs({
      ls: vi.fn().mockResolvedValue([{ name: 'f.txt', type: 'file' }]),
    })
    const sh = new AgenticShell(mockFs)
    const out = (await sh.exec('rm -rf /dir')).output
    expect(out).toBe('')
    expect(mockFs.delete).toHaveBeenCalledWith('/dir/f.txt')
    expect(mockFs.delete).toHaveBeenCalledWith('/dir')
  })
})

// rm -r root safety boundary tests
describe('rm -r root safety boundary tests', () => {
  it('rm / (without -r) also refuses to remove root', async () => {
    const mockFs = makeMockFs()
    const sh = new AgenticShell(mockFs)
    const out = (await sh.exec('rm /')).output
    expect(out).toBe("rm: refusing to remove '/'")
    expect(mockFs.delete).not.toHaveBeenCalled()
  })

  it('rm -rf / refuses to remove root', async () => {
    const mockFs = makeMockFs()
    const sh = new AgenticShell(mockFs)
    const out = (await sh.exec('rm -rf /')).output
    expect(out).toBe("rm: refusing to remove '/'")
    expect(mockFs.delete).not.toHaveBeenCalled()
  })

  it('rm -r /tmp still works after root safety check', async () => {
    const mockFs = makeMockFs({
      ls: vi.fn().mockResolvedValue([{ name: 'f.txt', type: 'file' }]),
    })
    const sh = new AgenticShell(mockFs)
    const out = (await sh.exec('rm -r /tmp')).output
    expect(out).toBe('')
    expect(mockFs.delete).toHaveBeenCalledWith('/tmp/f.txt')
    expect(mockFs.delete).toHaveBeenCalledWith('/tmp')
  })
})
