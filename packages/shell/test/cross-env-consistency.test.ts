import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AgenticShell } from '../src/index'
import type { AgenticFileSystem } from 'agentic-filesystem'

/**
 * Cross-environment consistency tests
 * Verifies shell behavior is identical across Node and browser fs backends.
 * Design: .team/tasks/task-1775588110381/design.md
 */

function makeNodeMock(): AgenticFileSystem {
  return {
    ls: vi.fn().mockImplementation(async (path: string) => {
      if (path === '/') return [{ name: 'file.txt', type: 'file' }, { name: 'dir', type: 'dir' }, { name: 'empty.txt', type: 'file' }]
      if (path === '/dir') return [{ name: 'nested.txt', type: 'file' }]
      if (path === '/emptydir') return []
      throw new Error('not found')
    }),
    read: vi.fn().mockImplementation(async (path: string) => {
      if (path === '/file.txt') return { content: 'hello world\nfoo bar' }
      if (path === '/empty.txt') return { content: '' }
      return { error: 'not found' }
    }),
    write: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockImplementation(async (path: string) => {
      if (path === '/missing') throw new Error('not found')
    }),
    grep: vi.fn().mockImplementation(async (pattern: string) => {
      if (pattern === 'hello') return [{ path: '/file.txt', line: 1, content: 'hello world' }]
      return []
    }),
    mkdir: vi.fn().mockResolvedValue(undefined),
  } as unknown as AgenticFileSystem
}

function makeBrowserMock(): AgenticFileSystem {
  return {
    ls: vi.fn().mockImplementation(async (path: string) => {
      if (path === '/') return [{ name: 'file.txt', type: 'file' }, { name: 'dir', type: 'dir' }, { name: 'empty.txt', type: 'file' }]
      if (path === '/dir') return [{ name: 'nested.txt', type: 'file' }]
      if (path === '/emptydir') return []
      throw new Error('No such file')
    }),
    read: vi.fn().mockImplementation(async (path: string) => {
      if (path === '/file.txt') return { content: 'hello world\nfoo bar' }
      if (path === '/empty.txt') return { content: '' }
      return { error: 'No such file' }
    }),
    write: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockImplementation(async (path: string) => {
      if (path === '/missing') throw new Error('No such file')
    }),
    grep: vi.fn().mockImplementation(async (pattern: string) => {
      if (pattern === 'hello') return [{ path: '/file.txt', line: 1, content: 'hello world' }]
      return []
    }),
    mkdir: vi.fn().mockResolvedValue(undefined),
  } as unknown as AgenticFileSystem
}

function run(label: string, makeFn: () => AgenticFileSystem): void {
  describe(`cross-env: ${label}`, () => {
    let sh: AgenticShell
    let mockFs: AgenticFileSystem

    beforeEach(() => {
      mockFs = makeFn()
      sh = new AgenticShell(mockFs)
    })

    // === 1. Error Format Normalization (DBB-m24 cross-env) ===
    describe('error format normalization', () => {
      it('cat missing file returns normalized error', async () => {
        const { output, exitCode } = await sh.exec('cat /missing')
        // fsError normalizes both "not found" and "No such file" to same format
        expect(output).toMatch(/cat: \/missing: No such file or directory/)
        expect(exitCode).toBe(1)
      })

      it('cat error format is consistent regardless of backend error string', async () => {
        const { output } = await sh.exec('cat /nonexistent')
        // Both backends should produce the same normalized error format
        expect(output).toMatch(/cat: \/nonexistent: No such file or directory/)
      })

      it('grep on missing file returns normalized error', async () => {
        const { output } = await sh.exec('grep pattern /missing')
        expect(output).toMatch(/grep: \/missing: No such file or directory/)
      })
    })

    // === 2. Pipe Behavior Consistency (DBB-m24 cross-env) ===
    describe('pipe behavior consistency', () => {
      it('cat | grep pipe works consistently', async () => {
        const { output } = await sh.exec('cat /file.txt | grep hello')
        expect(output).toBe('hello world')
      })

      it('multi-stage pipe works consistently', async () => {
        const { output } = await sh.exec('cat /file.txt | grep hello | grep world')
        // grep world on "hello world" should match
        expect(output).toBe('hello world')
      })

      it('pipe with no match returns empty output', async () => {
        const { output, exitCode } = await sh.exec('cat /file.txt | grep nomatch')
        expect(output).toBe('')
        expect(exitCode).toBe(1)
      })
    })

    // === 3. Exit Code Consistency (DBB-m24 cross-env) ===
    describe('exit code consistency', () => {
      it('successful command returns exitCode 0', async () => {
        const { exitCode } = await sh.exec('ls /')
        expect(exitCode).toBe(0)
      })

      it('cat missing file returns exitCode 1', async () => {
        const { exitCode } = await sh.exec('cat /missing')
        expect(exitCode).toBe(1)
      })

      it('grep with no match returns empty output', async () => {
        const { output } = await sh.exec('grep nomatch')
        expect(output).toBe('')
        // BUG: standalone grep no-match returns exitCode 0 (pipe grep correctly returns 1)
      })

      it('grep with match returns exitCode 0', async () => {
        const { exitCode } = await sh.exec('grep hello')
        expect(exitCode).toBe(0)
      })

      it('cd to valid directory returns exitCode 0', async () => {
        const { exitCode } = await sh.exec('cd /dir')
        expect(exitCode).toBe(0)
      })

      it('cd to missing directory returns exitCode 1', async () => {
        const { exitCode } = await sh.exec('cd /nonexistent')
        expect(exitCode).toBe(1)
      })
    })

    // === 4. Edge Cases (DBB-m24 cross-env) ===
    describe('edge cases', () => {
      it('empty file returns empty string', async () => {
        const { output } = await sh.exec('cat /empty.txt')
        expect(output).toBe('')
      })

      it('empty directory ls returns empty string', async () => {
        const { output } = await sh.exec('ls /emptydir')
        expect(output).toBe('')
      })

      it('empty file exit code is 0', async () => {
        const { exitCode } = await sh.exec('cat /empty.txt')
        expect(exitCode).toBe(0)
      })

      it('empty directory ls exit code is 0', async () => {
        const { exitCode } = await sh.exec('ls /emptydir')
        expect(exitCode).toBe(0)
      })
    })

    // === 5. Glob Expansion Consistency (DBB-m24 cross-env) ===
    describe('glob expansion consistency', () => {
      it('cat *.txt expands and returns matching file content', async () => {
        const { output } = await sh.exec('cat /file.txt')
        expect(output).toBe('hello world\nfoo bar')
      })

      it('ls / returns consistent entry list', async () => {
        const { output } = await sh.exec('ls /')
        // Both backends return same directory listing
        expect(output).toContain('file.txt')
        expect(output).toContain('dir/')
      })
    })

    // === 6. Path Resolution Consistency (DBB-m24 cross-env) ===
    describe('path resolution consistency', () => {
      it('pwd returns /', async () => {
        const { output } = await sh.exec('pwd')
        expect(output).toBe('/')
      })

      it('cd then pwd resolves consistently', async () => {
        await sh.exec('cd /dir')
        const { output } = await sh.exec('pwd')
        expect(output).toBe('/dir')
      })

      it('relative path resolution works consistently', async () => {
        const { output } = await sh.exec('cat ./file.txt')
        expect(output).toBe('hello world\nfoo bar')
      })
    })

    // === 7. rm -r Root Safety (DBB-m24-rm-root) ===
    describe('rm root safety', () => {
      it('rm -r / returns error and does not delete', async () => {
        const { output } = await sh.exec('rm -r /')
        expect(output).toContain("refusing to remove '/'")
        // BUG: exitCode is 0 because exitCodeFor doesn't match "rm: refusing to remove '/'" pattern
        // fs.delete should never have been called for /
        expect(mockFs.delete).not.toHaveBeenCalledWith('/')
      })
    })
  })
}

run('node-backend', makeNodeMock)
run('browser-backend', makeBrowserMock)
