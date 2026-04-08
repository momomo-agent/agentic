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

describe('rm -r deep nesting', () => {
  it('rm -r handles 20+ level deep directory tree', async () => {
    const depth = 25
    const deleteFn = vi.fn().mockResolvedValue(undefined)
    const lsFn = vi.fn().mockImplementation(async (path: string) => {
      const parts = path.replace(/^\//, '').split('/').filter(Boolean)
      if (parts.length < depth) {
        return [{ name: String.fromCharCode(97 + (parts.length % 26)), type: 'dir' }]
      }
      if (parts.length === depth) {
        return [{ name: 'deep.txt', type: 'file' }]
      }
      return []
    })

    const fs = makeMockFs({ ls: lsFn, delete: deleteFn })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('rm -r /a')
    expect(r.output).toBe('')
    expect(r.exitCode).toBe(0)
    expect(deleteFn).toHaveBeenCalled()
    // Verify leaf file was deleted
    expect(deleteFn).toHaveBeenCalledWith(
      expect.stringMatching(/deep\.txt$/)
    )
    // Verify root dir was deleted
    expect(deleteFn).toHaveBeenCalledWith('/a')
    // 25 dirs + 1 file = 26 delete calls minimum
    expect(deleteFn.mock.calls.length).toBeGreaterThanOrEqual(depth + 1)
  })

  it('rm -r handles wide directory (100+ entries)', async () => {
    const deleteFn = vi.fn().mockResolvedValue(undefined)
    const fileCount = 100
    const dirCount = 50
    const files = Array.from({ length: fileCount }, (_, i) => ({ name: `f${i}.txt`, type: 'file' as const }))
    const dirs = Array.from({ length: dirCount }, (_, i) => ({ name: `d${i}`, type: 'dir' as const }))
    const allEntries = [...files, ...dirs]

    const fs = makeMockFs({
      ls: vi.fn().mockImplementation(async (path: string) => {
        if (path === '/wide') return allEntries
        // Each sub-dir is empty
        return []
      }),
      delete: deleteFn,
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('rm -r /wide')
    expect(r.output).toBe('')
    // 100 files + 50 dirs + 1 root dir = 151 delete calls
    expect(deleteFn).toHaveBeenCalledTimes(fileCount + dirCount + 1)
    // Verify some file deletions
    expect(deleteFn).toHaveBeenCalledWith('/wide/f0.txt')
    expect(deleteFn).toHaveBeenCalledWith('/wide/f99.txt')
    // Verify sub-dir deletions
    expect(deleteFn).toHaveBeenCalledWith('/wide/d0')
    expect(deleteFn).toHaveBeenCalledWith('/wide/d49')
    // Verify root deletion
    expect(deleteFn).toHaveBeenCalledWith('/wide')
  })

  it('rm -r handles mixed deep and wide tree', async () => {
    const deleteFn = vi.fn().mockResolvedValue(undefined)
    const lsFn = vi.fn().mockImplementation(async (path: string) => {
      if (path === '/root') {
        // 3 branches: shallow-wide, deep-narrow, deep-wide
        return [
          { name: 'shallow', type: 'dir' },
          { name: 'deep', type: 'dir' },
          { name: 'mixed', type: 'dir' },
          { name: 'root-file.txt', type: 'file' },
        ]
      }
      if (path === '/root/shallow') {
        // Wide: 20 files + 5 dirs
        const files = Array.from({ length: 20 }, (_, i) => ({ name: `s${i}.txt`, type: 'file' as const }))
        const dirs = Array.from({ length: 5 }, (_, i) => ({ name: `sd${i}`, type: 'dir' as const }))
        return [...files, ...dirs]
      }
      if (path.startsWith('/root/shallow/sd')) {
        // Each shallow sub-dir has 2 files
        return [
          { name: 'a.txt', type: 'file' },
          { name: 'b.txt', type: 'file' },
        ]
      }
      if (path === '/root/deep') {
        return [{ name: 'd1', type: 'dir' }]
      }
      if (path.startsWith('/root/deep/d1')) {
        const parts = path.replace('/root/deep/d1', '').replace(/^\//, '').split('/').filter(Boolean)
        if (parts.length < 8) return [{ name: `d${parts.length + 2}`, type: 'dir' }]
        return [{ name: 'deepest.txt', type: 'file' }]
      }
      if (path === '/root/mixed') {
        // Both deep and wide: 3 dirs that go deep + 10 files
        const files = Array.from({ length: 10 }, (_, i) => ({ name: `m${i}.txt`, type: 'file' as const }))
        return [
          ...files,
          { name: 'branch1', type: 'dir' },
          { name: 'branch2', type: 'dir' },
        ]
      }
      if (path === '/root/mixed/branch1') {
        return [{ name: 'b1-deep', type: 'dir' }, { name: 'b1-file.txt', type: 'file' }]
      }
      if (path === '/root/mixed/branch1/b1-deep') {
        return [{ name: 'leaf.txt', type: 'file' }]
      }
      if (path === '/root/mixed/branch2') {
        return [{ name: 'b2-file.txt', type: 'file' }]
      }
      return []
    })

    const fs = makeMockFs({ ls: lsFn, delete: deleteFn })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('rm -r /root')
    expect(r.output).toBe('')
    expect(r.exitCode).toBe(0)

    // Verify specific known paths were deleted
    expect(deleteFn).toHaveBeenCalledWith('/root/root-file.txt')
    expect(deleteFn).toHaveBeenCalledWith('/root/shallow/s0.txt')
    expect(deleteFn).toHaveBeenCalledWith('/root/shallow/sd0/a.txt')
    expect(deleteFn).toHaveBeenCalledWith('/root/shallow/sd4/b.txt')
    expect(deleteFn).toHaveBeenCalledWith('/root/mixed/m0.txt')
    expect(deleteFn).toHaveBeenCalledWith('/root/mixed/branch1/b1-file.txt')
    expect(deleteFn).toHaveBeenCalledWith('/root/mixed/branch1/b1-deep/leaf.txt')
    // Verify the deepest file in the deep branch was deleted
    const deepCalls = deleteFn.mock.calls.map((c: string[]) => c[0])
    expect(deepCalls.some((p: string) => p.includes('deepest.txt'))).toBe(true)
    expect(deleteFn).toHaveBeenCalledWith('/root')

    // Should have many delete calls (no stack overflow = test passes)
    expect(deleteFn.mock.calls.length).toBeGreaterThan(40)
  })

  it('handles single-file directory', async () => {
    const deleteFn = vi.fn().mockResolvedValue(undefined)
    const fs = makeMockFs({
      ls: vi.fn().mockImplementation(async (path: string) => {
        if (path === '/dir') return [{ name: 'file.txt', type: 'file' }]
        return []
      }),
      delete: deleteFn,
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('rm -r /dir')
    expect(r.output).toBe('')
    expect(deleteFn).toHaveBeenCalledWith('/dir/file.txt')
    expect(deleteFn).toHaveBeenCalledWith('/dir')
  })

  it('cycle detection prevents infinite loop', async () => {
    const deleteFn = vi.fn().mockResolvedValue(undefined)
    let callCount = 0
    const fs = makeMockFs({
      ls: vi.fn().mockImplementation(async (path: string) => {
        callCount++
        if (callCount > 100) throw new Error('too many ls calls - possible infinite loop')
        if (path === '/a') return [{ name: 'b', type: 'dir' }]
        if (path === '/a/b') return [{ name: '..', type: 'dir' }] // cycle back
        return []
      }),
      delete: deleteFn,
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('rm -r /a')
    // Should complete without infinite loop (visited set catches it)
    expect(r.output).toBe('')
    expect(callCount).toBeLessThanOrEqual(100)
  })
})
