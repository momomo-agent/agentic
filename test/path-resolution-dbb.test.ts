import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AgenticShell } from '../src/index'
import type { AgenticFileSystem } from 'agentic-filesystem'

function makeMockFs(): AgenticFileSystem {
  const dirs = new Set(['/'])
  const files = new Map<string, string>()

  return {
    ls: vi.fn().mockImplementation(async (path: string) => {
      const normalized = path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path
      const entries: any[] = []
      for (const dir of dirs) {
        if (dir.startsWith(normalized + '/') && dir !== normalized) {
          const rel = dir.slice(normalized.length + 1)
          if (rel && !rel.includes('/')) entries.push({ name: rel, path: dir, type: 'directory' })
        }
      }
      for (const [file] of files) {
        if (file.startsWith(normalized + '/')) {
          const rel = file.slice(normalized.length + 1)
          if (rel && !rel.includes('/')) entries.push({ name: rel, path: file, type: 'file' })
        }
      }
      return entries
    }),
    read: vi.fn().mockImplementation(async (path: string) => {
      if (files.has(path)) return { content: files.get(path), error: null }
      return { content: null, error: 'No such file or directory' }
    }),
    write: vi.fn().mockImplementation(async (path: string, content: string) => { files.set(path, content) }),
    delete: vi.fn().mockImplementation(async (path: string) => { files.delete(path); dirs.delete(path) }),
    mkdir: vi.fn().mockImplementation(async (path: string) => { dirs.add(path) }),
    grep: vi.fn().mockResolvedValue([]),
  } as unknown as AgenticFileSystem
}

describe('path resolution (DBB-path-001 to DBB-path-005)', () => {
  let shell: AgenticShell
  let fs: AgenticFileSystem

  beforeEach(async () => {
    fs = makeMockFs()
    await fs.mkdir('/a')
    await fs.mkdir('/a/b')
    await fs.mkdir('/a/b/c')
    await fs.mkdir('/a/foo')
    shell = new AgenticShell(fs)
  })

  // DBB-path-001: basic .. traversal
  it('resolves ../ correctly', async () => {
    await shell.exec('cd /a/b')
    expect((await shell.exec('pwd')).output).toBe('/a/b')
    await shell.exec('cd ..')
    expect((await shell.exec('pwd')).output).toBe('/a')
  })

  // DBB-path-002: root escape prevention
  it('prevents escaping root with excessive ..', async () => {
    await shell.exec('cd /')
    await shell.exec('cd ../../../..')
    expect((await shell.exec('pwd')).output).toBe('/')
  })

  // DBB-path-003: relative-to-absolute from nested cwd
  it('resolves relative path from nested cwd', async () => {
    await shell.exec('cd /a/b/c')
    await shell.exec('touch ../file2.txt')
    const ls = (await shell.exec('ls /a/b')).output
    expect(ls).toContain('file2.txt')
  })

  // DBB-path-004: . stays at cwd
  it('resolve(".") returns cwd', async () => {
    await shell.exec('cd /a/b')
    await shell.exec('cd .')
    expect((await shell.exec('pwd')).output).toBe('/a/b')
  })

  // DBB-path-005: deep ../ chain
  it('resolves ../../foo from /a/b/c to /a/foo', async () => {
    await shell.exec('cd /a/b/c')
    await shell.exec('cd ../../foo')
    expect((await shell.exec('pwd')).output).toBe('/a/foo')
  })
})
