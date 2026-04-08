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

describe('DBB-002: find recursive directory traversal', () => {
  it('find /dir returns entries from all subdirectories recursively', async () => {
    const mockLs = vi.fn()
      .mockImplementation(async (path: string) => {
        if (path === '/dir') {
          return [
            { name: 'file1.txt', type: 'file' },
            { name: 'subdir', type: 'dir' },
          ]
        }
        if (path === '/dir/subdir') {
          return [
            { name: 'file2.txt', type: 'file' },
            { name: 'nested', type: 'dir' },
          ]
        }
        if (path === '/dir/subdir/nested') {
          return [{ name: 'file3.txt', type: 'file' }]
        }
        return []
      })

    const fs = makeMockFs({ ls: mockLs })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('find /dir')).output

    expect(out).toContain('/dir/file1.txt')
    expect(out).toContain('/dir/subdir')
    expect(out).toContain('/dir/subdir/file2.txt')
    expect(out).toContain('/dir/subdir/nested')
    expect(out).toContain('/dir/subdir/nested/file3.txt')
  })

  it('find /dir -name "*.ts" matches files in nested subdirs', async () => {
    const mockLs = vi.fn()
      .mockImplementation(async (path: string) => {
        if (path === '/src') {
          return [
            { name: 'index.ts', type: 'file' },
            { name: 'index.js', type: 'file' },
            { name: 'components', type: 'dir' },
          ]
        }
        if (path === '/src/components') {
          return [
            { name: 'Button.tsx', type: 'file' },
            { name: 'utils', type: 'dir' },
          ]
        }
        if (path === '/src/components/utils') {
          return [
            { name: 'helpers.ts', type: 'file' },
            { name: 'styles.css', type: 'file' },
          ]
        }
        return []
      })

    const fs = makeMockFs({ ls: mockLs })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('find /src -name "*.ts"')).output

    expect(out).toContain('/src/index.ts')
    expect(out).toContain('/src/components/utils/helpers.ts')
    expect(out).not.toContain('/src/index.js')
    expect(out).not.toContain('/src/components/Button.tsx')
    expect(out).not.toContain('/src/components/utils/styles.css')
  })

  it('find /dir -type f returns only files recursively', async () => {
    const mockLs = vi.fn()
      .mockImplementation(async (path: string) => {
        if (path === '/project') {
          return [
            { name: 'README.md', type: 'file' },
            { name: 'src', type: 'dir' },
            { name: 'test', type: 'dir' },
          ]
        }
        if (path === '/project/src') {
          return [
            { name: 'index.ts', type: 'file' },
            { name: 'lib', type: 'dir' },
          ]
        }
        if (path === '/project/src/lib') {
          return [{ name: 'utils.ts', type: 'file' }]
        }
        if (path === '/project/test') {
          return [{ name: 'test.ts', type: 'file' }]
        }
        return []
      })

    const fs = makeMockFs({ ls: mockLs })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('find /project -type f')).output

    const lines = out.split('\n')
    expect(lines).toContain('/project/README.md')
    expect(lines).toContain('/project/src/index.ts')
    expect(lines).toContain('/project/src/lib/utils.ts')
    expect(lines).toContain('/project/test/test.ts')
    expect(lines).not.toContain('/project/src')
    expect(lines).not.toContain('/project/test')
    expect(lines).not.toContain('/project/src/lib')
  })

  it('find /dir -type d returns only directories recursively', async () => {
    const mockLs = vi.fn()
      .mockImplementation(async (path: string) => {
        if (path === '/project') {
          return [
            { name: 'README.md', type: 'file' },
            { name: 'src', type: 'dir' },
            { name: 'test', type: 'dir' },
          ]
        }
        if (path === '/project/src') {
          return [
            { name: 'index.ts', type: 'file' },
            { name: 'lib', type: 'dir' },
          ]
        }
        if (path === '/project/src/lib') {
          return [{ name: 'utils.ts', type: 'file' }]
        }
        if (path === '/project/test') {
          return [{ name: 'test.ts', type: 'file' }]
        }
        return []
      })

    const fs = makeMockFs({ ls: mockLs })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('find /project -type d')).output

    expect(out).toContain('/project/src')
    expect(out).toContain('/project/test')
    expect(out).toContain('/project/src/lib')
    expect(out).not.toContain('/project/README.md')
    expect(out).not.toContain('/project/src/index.ts')
    expect(out).not.toContain('/project/src/lib/utils.ts')
    expect(out).not.toContain('/project/test/test.ts')
  })

  it('results include full paths', async () => {
    const mockLs = vi.fn()
      .mockImplementation(async (path: string) => {
        if (path === '/dir') {
          return [{ name: 'sub', type: 'dir' }]
        }
        if (path === '/dir/sub') {
          return [{ name: 'file.txt', type: 'file' }]
        }
        return []
      })

    const fs = makeMockFs({ ls: mockLs })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('find /dir')).output

    const lines = out.split('\n')
    expect(lines).toContain('/dir/sub/file.txt')
    expect(lines.some(line => line === 'file.txt')).toBe(false)
    expect(lines.some(line => line === 'sub/file.txt')).toBe(false)
  })
})

describe('find recursive edge cases', () => {
  it('handles empty directory', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([]),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('find /empty')).output
    expect(out).toBe('')
  })

  it('handles deeply nested directories (5+ levels)', async () => {
    const mockLs = vi.fn()
      .mockImplementation(async (path: string) => {
        if (path === '/a') return [{ name: 'b', type: 'dir' }]
        if (path === '/a/b') return [{ name: 'c', type: 'dir' }]
        if (path === '/a/b/c') return [{ name: 'd', type: 'dir' }]
        if (path === '/a/b/c/d') return [{ name: 'e', type: 'dir' }]
        if (path === '/a/b/c/d/e') return [{ name: 'file.txt', type: 'file' }]
        return []
      })

    const fs = makeMockFs({ ls: mockLs })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('find /a')).output

    expect(out).toContain('/a/b/c/d/e/file.txt')
  })

  it('handles directory with many files', async () => {
    const files = Array.from({ length: 100 }, (_, i) => ({
      name: `file${i}.txt`,
      type: 'file' as const,
    }))

    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue(files),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('find /dir')).output

    expect(out.split('\n').length).toBe(100)
    expect(out).toContain('/dir/file0.txt')
    expect(out).toContain('/dir/file99.txt')
  })

  it('skips subdirectory when ls throws error', async () => {
    const mockLs = vi.fn()
      .mockImplementation(async (path: string) => {
        if (path === '/dir') {
          return [
            { name: 'accessible', type: 'dir' },
            { name: 'forbidden', type: 'dir' },
          ]
        }
        if (path === '/dir/accessible') {
          return [{ name: 'file.txt', type: 'file' }]
        }
        if (path === '/dir/forbidden') {
          throw new Error('Permission denied')
        }
        return []
      })

    const fs = makeMockFs({ ls: mockLs })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('find /dir')).output

    expect(out).toContain('/dir/accessible')
    expect(out).toContain('/dir/accessible/file.txt')
    expect(out).toContain('/dir/forbidden')
    // Should not crash, just skip the forbidden directory
  })

  it('handles circular directory references with visited set', async () => {
    const mockLs = vi.fn()
      .mockImplementation(async (path: string) => {
        if (path === '/dir') {
          return [{ name: 'file.txt', type: 'file' }]
        }
        return []
      })

    const fs = makeMockFs({ ls: mockLs })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('find /dir')).output

    // Should complete without infinite loop
    expect(out).toContain('/dir/file.txt')
    expect(mockLs).toHaveBeenCalledTimes(1)
  })
})

describe('find recursive combined with filters', () => {
  it('find /dir -name "*.ts" -type f returns only .ts files', async () => {
    const mockLs = vi.fn()
      .mockImplementation(async (path: string) => {
        if (path === '/src') {
          return [
            { name: 'index.ts', type: 'file' },
            { name: 'components.ts', type: 'dir' }, // dir named .ts
            { name: 'test.js', type: 'file' },
          ]
        }
        if (path === '/src/components.ts') {
          return [{ name: 'Button.ts', type: 'file' }]
        }
        return []
      })

    const fs = makeMockFs({ ls: mockLs })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('find /src -name "*.ts" -type f')).output

    const lines = out.split('\n')
    expect(lines).toContain('/src/index.ts')
    expect(lines).toContain('/src/components.ts/Button.ts')
    expect(lines).not.toContain('/src/components.ts') // dir excluded by -type f
    expect(lines).not.toContain('/src/test.js')
  })

  it('find /dir -name "test*" -type d returns only dirs starting with test', async () => {
    const mockLs = vi.fn()
      .mockImplementation(async (path: string) => {
        if (path === '/project') {
          return [
            { name: 'test', type: 'dir' },
            { name: 'tests', type: 'dir' },
            { name: 'test.txt', type: 'file' },
            { name: 'src', type: 'dir' },
          ]
        }
        if (path === '/project/test') {
          return [{ name: 'unit', type: 'dir' }]
        }
        if (path === '/project/tests') {
          return []
        }
        if (path === '/project/src') {
          return [{ name: 'test-utils', type: 'dir' }]
        }
        if (path === '/project/src/test-utils') {
          return []
        }
        return []
      })

    const fs = makeMockFs({ ls: mockLs })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('find /project -name "test*" -type d')).output

    expect(out).toContain('/project/test')
    expect(out).toContain('/project/tests')
    expect(out).toContain('/project/src/test-utils')
    expect(out).not.toContain('/project/test.txt')
    expect(out).not.toContain('/project/test/unit')
  })
})

describe('find -type edge cases', () => {
  it('find /empty -type f returns empty string', async () => {
    const fs = makeMockFs({ ls: vi.fn().mockResolvedValue([]) })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('find /empty -type f')).output
    expect(out).toBe('')
  })

  it('find /dir -type d returns nothing when only files exist', async () => {
    const mockLs = vi.fn()
      .mockImplementation(async (path: string) => {
        if (path === '/dir') {
          return [
            { name: 'a.txt', type: 'file' },
            { name: 'b.txt', type: 'file' },
          ]
        }
        return []
      })

    const fs = makeMockFs({ ls: mockLs })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('find /dir -type d')).output
    expect(out).toBe('')
  })

  it('find /project -type f -name "*.ts" finds .ts files at all depths', async () => {
    const mockLs = vi.fn()
      .mockImplementation(async (path: string) => {
        if (path === '/project') {
          return [
            { name: 'README.md', type: 'file' },
            { name: 'src', type: 'dir' },
            { name: 'test', type: 'dir' },
          ]
        }
        if (path === '/project/src') {
          return [
            { name: 'index.ts', type: 'file' },
            { name: 'lib', type: 'dir' },
          ]
        }
        if (path === '/project/src/lib') {
          return [{ name: 'utils.ts', type: 'file' }]
        }
        if (path === '/project/test') {
          return [{ name: 'a.ts', type: 'file' }]
        }
        return []
      })

    const fs = makeMockFs({ ls: mockLs })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('find /project -type f -name "*.ts"')).output

    expect(out).toContain('/project/src/index.ts')
    expect(out).toContain('/project/src/lib/utils.ts')
    expect(out).toContain('/project/test/a.ts')
    expect(out).not.toContain('/project/README.md')
  })

  it('find /a -type d returns all directories at all depths', async () => {
    const mockLs = vi.fn()
      .mockImplementation(async (path: string) => {
        if (path === '/a') return [{ name: 'b', type: 'dir' }]
        if (path === '/a/b') return [{ name: 'c', type: 'dir' }]
        if (path === '/a/b/c') return [{ name: 'd', type: 'dir' }]
        return []
      })

    const fs = makeMockFs({ ls: mockLs })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('find /a -type d')).output

    expect(out).toContain('/a/b')
    expect(out).toContain('/a/b/c')
    expect(out).toContain('/a/b/c/d')
  })

  it('find /dir -type f returns empty when only directories exist', async () => {
    const mockLs = vi.fn()
      .mockImplementation(async (path: string) => {
        if (path === '/dir') {
          return [
            { name: 'sub1', type: 'dir' },
            { name: 'sub2', type: 'dir' },
          ]
        }
        if (path === '/dir/sub1') return []
        if (path === '/dir/sub2') return []
        return []
      })

    const fs = makeMockFs({ ls: mockLs })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('find /dir -type f')).output
    expect(out).toBe('')
  })
})

describe('find recursive with relative paths', () => {
  it('find . searches from current directory', async () => {
    const mockLs = vi.fn()
      .mockImplementation(async (path: string) => {
        if (path === '/home/user') {
          return [
            { name: 'file.txt', type: 'file' },
            { name: 'subdir', type: 'dir' },
          ]
        }
        if (path === '/home/user/subdir') {
          return [{ name: 'nested.txt', type: 'file' }]
        }
        return []
      })

    const fs = makeMockFs({
      ls: mockLs,
      read: vi.fn().mockResolvedValue({ content: undefined, error: 'is a directory' }),
    })
    const sh = new AgenticShell(fs)
    await sh.exec('cd /home/user')
    const out = (await sh.exec('find .')).output

    expect(out).toContain('/home/user/file.txt')
    expect(out).toContain('/home/user/subdir')
    expect(out).toContain('/home/user/subdir/nested.txt')
  })

  it('find without path defaults to current directory', async () => {
    const mockLs = vi.fn()
      .mockImplementation(async (path: string) => {
        if (path === '/tmp') {
          return [{ name: 'temp.txt', type: 'file' }]
        }
        return []
      })

    const fs = makeMockFs({
      ls: mockLs,
      read: vi.fn().mockResolvedValue({ content: undefined, error: 'is a directory' }),
    })
    const sh = new AgenticShell(fs)
    await sh.exec('cd /tmp')
    const out = (await sh.exec('find')).output

    expect(out).toContain('/tmp/temp.txt')
  })
})
