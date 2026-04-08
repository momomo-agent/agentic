import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AgenticShell } from '../src/index'
import type { AgenticFileSystem } from 'agentic-filesystem'

function makeMockFs(overrides = {}): AgenticFileSystem {
  const dirs = new Set(['/'])
  const files = new Map<string, string>()

  return {
    ls: vi.fn().mockImplementation(async (path: string) => {
      const entries: any[] = []
      const normalized = path.endsWith('/') ? path.slice(0, -1) : path

      for (const dir of dirs) {
        if (dir.startsWith(normalized + '/') && dir !== normalized) {
          const rel = dir.slice(normalized.length + 1)
          if (rel && !rel.includes('/')) {
            const name = rel
            entries.push({ name, path: dir, type: 'directory' })
          }
        }
      }
      for (const [file] of files) {
        if (file.startsWith(normalized + '/')) {
          const rel = file.slice(normalized.length + 1)
          if (rel && !rel.includes('/')) {
            const name = rel
            entries.push({ name, path: file, type: 'file' })
          }
        }
      }
      return entries
    }),
    read: vi.fn().mockImplementation(async (path: string) => {
      if (files.has(path)) {
        return { content: files.get(path), error: null }
      }
      return { content: null, error: 'No such file or directory' }
    }),
    write: vi.fn().mockImplementation(async (path: string, content: string) => {
      files.set(path, content)
    }),
    delete: vi.fn().mockImplementation(async (path: string) => {
      files.delete(path)
      dirs.delete(path)
    }),
    mkdir: vi.fn().mockImplementation(async (path: string) => {
      dirs.add(path)
    }),
    grep: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as AgenticFileSystem
}

describe('DBB-004: resolve() normalizes ../ paths', () => {
  let shell: AgenticShell
  let fs: AgenticFileSystem

  beforeEach(async () => {
    fs = makeMockFs()
    await fs.mkdir('/a')
    await fs.mkdir('/a/b')
    await fs.mkdir('/a/b/c')
    shell = new AgenticShell(fs)
  })

  it('resolve("../foo") from /a/b returns /a/foo', async () => {
    await shell.exec('cd /a/b')
    const result = (await shell.exec('pwd')).output
    expect(result).toBe('/a/b')

    // Test by trying to create a file with relative path
    await shell.exec('cd /a/b')
    await shell.exec('touch ../foo.txt')
    const ls = (await shell.exec('ls /a')).output
    expect(ls).toContain('foo.txt')
  })

  it('resolve("../../foo") from /a/b/c returns /a/foo', async () => {
    await shell.exec('cd /a/b/c')
    await shell.exec('touch ../../bar.txt')
    const ls = (await shell.exec('ls /a')).output
    expect(ls).toContain('bar.txt')
  })

  it('resolve("../..") from /a/b returns /', async () => {
    await shell.exec('cd /a/b')
    await shell.exec('cd ../..')
    const pwd = (await shell.exec('pwd')).output
    expect(pwd).toBe('/')
  })

  it('resolve("a/../b") returns /cwd/b', async () => {
    await shell.exec('cd /a')
    await shell.exec('mkdir -p x/y')
    await shell.exec('cd x')
    await shell.exec('touch y/../test.txt')
    const ls = (await shell.exec('ls /a/x')).output
    expect(ls).toContain('test.txt')
  })

  it('does not escape above root: resolve("../../..") from /a returns /', async () => {
    await shell.exec('cd /a')
    await shell.exec('cd ../../..')
    const pwd = (await shell.exec('pwd')).output
    expect(pwd).toBe('/')
  })

  it('handles absolute paths with ../', async () => {
    await shell.exec('mkdir -p /abs/path')
    await shell.exec('touch /abs/path/../foo.txt')
    const ls = (await shell.exec('ls /abs')).output
    expect(ls).toContain('foo.txt')
  })

  it('cd with ../ changes directory correctly', async () => {
    await shell.exec('cd /a/b/c')
    await shell.exec('cd ..')
    const pwd = (await shell.exec('pwd')).output
    expect(pwd).toBe('/a/b')
  })

  it('cd with ../../ changes directory correctly', async () => {
    await shell.exec('cd /a/b/c')
    await shell.exec('cd ../..')
    const pwd = (await shell.exec('pwd')).output
    expect(pwd).toBe('/a')
  })
})

describe('path resolution edge cases', () => {
  let shell: AgenticShell
  let fs: AgenticFileSystem

  beforeEach(async () => {
    fs = makeMockFs()
    await fs.mkdir('/a')
    await fs.mkdir('/a/b')
    await fs.mkdir('/a/b/c')
    shell = new AgenticShell(fs)
  })

  // Edge case 1: Trailing slash handling
  it('resolve handles trailing slash correctly', async () => {
    await shell.exec('cd /a/b/')
    expect((await shell.exec('pwd')).output).toBe('/a/b')
  })

  // Edge case 2: Multiple consecutive slashes
  it('resolve normalizes multiple consecutive slashes', async () => {
    await shell.exec('mkdir -p /a/b')
    await shell.exec('touch /a//b//file.txt')
    const ls = (await shell.exec('ls /a/b')).output
    expect(ls).toContain('file.txt')
  })

  // Edge case 3: ./. segment handling
  it('resolve handles ./ prefix from cwd', async () => {
    await shell.exec('cd /a/b')
    await shell.exec('touch ./file.txt')
    const ls = (await shell.exec('ls /a/b')).output
    expect(ls).toContain('file.txt')
  })

  // Edge case 4: cd to root stays at root
  it('cd / stays at /', async () => {
    await shell.exec('cd /a/b')
    await shell.exec('cd /')
    expect((await shell.exec('pwd')).output).toBe('/')
  })

  // Edge case 5: Deep nesting with mixed . and ..
  it('resolve handles /a/./b/../c correctly', async () => {
    await shell.exec('touch /a/./b/../new.txt')
    const ls = (await shell.exec('ls /a')).output
    expect(ls).toContain('new.txt')
  })

  // Edge case 6: Excessive .. from root stays root
  it('cd .. from / stays at /', async () => {
    await shell.exec('cd ..')
    expect((await shell.exec('pwd')).output).toBe('/')
    await shell.exec('cd ../../..')
    expect((await shell.exec('pwd')).output).toBe('/')
  })
})
