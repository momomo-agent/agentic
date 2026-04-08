import { describe, it, expect, vi } from 'vitest'
import { AgenticShell } from '../src/index'
import type { AgenticFileSystem } from 'agentic-filesystem'

function makeMockFs(overrides = {}): AgenticFileSystem {
  return {
    ls: vi.fn().mockRejectedValue(new Error('Not a directory')),
    read: vi.fn().mockResolvedValue({ content: 'data', error: null }),
    write: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    grep: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as AgenticFileSystem
}

// DBB-003: rm file.txt calls fs.delete and file no longer exists
describe('DBB-003: rm calls fs.delete', () => {
  it('rm file.txt calls fs.delete with resolved path', async () => {
    const mockFs = makeMockFs()
    const sh = new AgenticShell(mockFs)
    const out = (await sh.exec('rm /tmp/file.txt')).output
    expect(out).toBe('')
    expect(mockFs.delete).toHaveBeenCalledWith('/tmp/file.txt')
  })

  it('rm relative path resolves and calls fs.delete', async () => {
    const mockFs = makeMockFs({
      ls: vi.fn().mockResolvedValue([]),
      read: vi.fn().mockResolvedValue({ content: undefined, error: 'not a file' }),
    })
    const sh = new AgenticShell(mockFs)
    await sh.exec('cd /tmp')
    // after cd, make ls throw so rm treats path as file
    ;(mockFs.ls as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Not a directory'))
    const out = (await sh.exec('rm file.txt')).output
    expect(out).toBe('')
    expect(mockFs.delete).toHaveBeenCalledWith('/tmp/file.txt')
  })
})

// DBB-003: rm nonexistent returns error
describe('DBB-003: rm nonexistent returns error', () => {
  it('returns No such file or directory', async () => {
    const mockFs = makeMockFs({
      read: vi.fn().mockResolvedValue({ content: null, error: 'No such file or directory' }),
      ls: vi.fn().mockRejectedValue(new Error('No such file or directory')),
      delete: vi.fn().mockRejectedValue(new Error('No such file or directory')),
    })
    const sh = new AgenticShell(mockFs)
    const out = (await sh.exec('rm /nonexistent')).output
    expect(out).toContain('/nonexistent')
    expect(out).toMatch(/No such file or directory/i)
  })
})

// DBB-003: rm -r dir calls fs.delete recursively
describe('DBB-003: rm -r calls fs.delete recursively', () => {
  it('deletes all children then directory', async () => {
    const mockFs = makeMockFs({
      ls: vi.fn().mockImplementation((p: string) => {
        if (p === '/dir') return Promise.resolve([{ name: 'a.txt', type: 'file' }])
        return Promise.resolve([])
      }),
    })
    const sh = new AgenticShell(mockFs)
    const out = (await sh.exec('rm -r /dir')).output
    expect(out).toBe('')
    expect(mockFs.delete).toHaveBeenCalledWith('/dir/a.txt')
    expect(mockFs.delete).toHaveBeenCalledWith('/dir')
  })
})
