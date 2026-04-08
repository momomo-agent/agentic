import { describe, it, expect, beforeAll } from 'vitest'
import { AgenticShell } from '../src/index'
import type { AgenticFileSystem } from 'agentic-filesystem'
import { vi } from 'vitest'

function buildLargeFs(fileCount: number, fileSize: number): AgenticFileSystem {
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
    delete: vi.fn(),
    mkdir: vi.fn().mockImplementation(async (path: string) => { dirs.add(path) }),
    grep: vi.fn().mockImplementation(async (pattern: string, path: string) => {
      const results: any[] = []
      for (const [filePath, content] of files) {
        if (!path || filePath.startsWith(path)) {
          const lines = content.split('\n')
          lines.forEach((line, i) => {
            if (line.includes(pattern)) results.push({ path: filePath, line: i + 1, content: line })
          })
        }
      }
      return results
    }),
    _files: files,
    _dirs: dirs,
  } as unknown as AgenticFileSystem
}

describe('performance', () => {
  let grepShell: AgenticShell
  let findShell: AgenticShell
  let lsShell: AgenticShell

  beforeAll(async () => {
    // grep: 1MB file
    const grepFs = buildLargeFs(1, 1024 * 1024)
    const largeContent = 'a'.repeat(1024 * 1024 - 10) + '\npattern\n'
    ;(grepFs as any)._files.set('/large.txt', largeContent)
    grepShell = new AgenticShell(grepFs)

    // find + ls: 1000 files
    const manyFs = buildLargeFs(1000, 10)
    ;(manyFs as any)._dirs.add('/files')
    for (let i = 0; i < 1000; i++) {
      ;(manyFs as any)._files.set(`/files/file-${i}.txt`, 'x')
    }
    findShell = new AgenticShell(manyFs)
    lsShell = new AgenticShell(manyFs)
  })

  it('grep on 1MB file completes < 500ms', async () => {
    const t0 = performance.now()
    await grepShell.exec('grep pattern /large.txt')
    expect(performance.now() - t0).toBeLessThan(500)
  })

  it('find on 1000 files completes < 1000ms', async () => {
    const t0 = performance.now()
    await findShell.exec('find /files')
    expect(performance.now() - t0).toBeLessThan(1000)
  })

  it('ls pagination on 1000-entry dir completes < 100ms', async () => {
    const t0 = performance.now()
    await lsShell.exec('ls /files --page 1 --page-size 20')
    expect(performance.now() - t0).toBeLessThan(100)
  })
})
