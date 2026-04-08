import { describe, it, expect, beforeEach } from 'vitest'
import { AgenticShell } from '../src/index.js'
import type { AgenticFileSystem } from 'agentic-filesystem'

describe('grep streaming', () => {
  it('uses readStream when available for single file', async () => {
    const mockFs = {
      ls: async () => [],
      read: async () => ({ content: '' }),
      write: async () => {},
      delete: async () => {},
      grep: async () => [],
      mkdir: async () => {},
      readStream: async function* (path: string) {
        yield 'line 1 hello'
        yield 'line 2 world'
        yield 'line 3 hello again'
      }
    }
    const shell = new AgenticShell(mockFs as any)
    const out = (await shell.exec('grep hello /file.txt')).output
    const lines = out.split('\n')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toMatch(/line 1 hello/)
    expect(lines[1]).toMatch(/line 3 hello again/)
  })

  it('falls back to read when readStream not available', async () => {
    const mockFs = {
      ls: async () => [],
      read: async (path: string) => ({
        content: 'line 1 hello\nline 2 world\nline 3 hello again'
      }),
      write: async () => {},
      delete: async () => {},
      grep: async () => [],
      mkdir: async () => {},
    }
    const shell = new AgenticShell(mockFs as any)
    const out = (await shell.exec('grep hello /file.txt')).output
    expect(out).toMatch(/grep: warning: streaming unavailable/)
    const lines = out.split('\n')
    expect(lines).toHaveLength(3)
    expect(lines[1]).toMatch(/line 1 hello/)
    expect(lines[2]).toMatch(/line 3 hello again/)
  })

  it('grep -c with streaming returns count', async () => {
    const mockFs = {
      ls: async () => [],
      read: async () => ({ content: '' }),
      write: async () => {},
      delete: async () => {},
      grep: async () => [],
      mkdir: async () => {},
      readStream: async function* (path: string) {
        yield 'line 1 hello'
        yield 'line 2 world'
        yield 'line 3 hello again'
      }
    }
    const shell = new AgenticShell(mockFs as any)
    const out = (await shell.exec('grep -c hello /file.txt')).output
    expect(out).toBe('2')
  })

  it('grep -l with streaming returns filename', async () => {
    const mockFs = {
      ls: async () => [],
      read: async () => ({ content: '' }),
      write: async () => {},
      delete: async () => {},
      grep: async () => [],
      mkdir: async () => {},
      readStream: async function* (path: string) {
        yield 'line 1 hello'
        yield 'line 2 world'
      }
    }
    const shell = new AgenticShell(mockFs as any)
    const out = (await shell.exec('grep -l hello /file.txt')).output
    expect(out).toBe('/file.txt')
  })

  it('grep with no matches returns empty string', async () => {
    const mockFs = {
      ls: async () => [],
      read: async () => ({ content: '' }),
      write: async () => {},
      delete: async () => {},
      grep: async () => [],
      mkdir: async () => {},
      readStream: async function* (path: string) {
        yield 'line 1 world'
        yield 'line 2 world'
      }
    }
    const shell = new AgenticShell(mockFs as any)
    const out = (await shell.exec('grep hello /file.txt')).output
    expect(out).toBe('')
  })

  it('grep with file error returns error message', async () => {
    const mockFs = {
      ls: async () => [],
      read: async () => ({ error: 'No such file or directory' }),
      write: async () => {},
      delete: async () => {},
      grep: async () => [],
      mkdir: async () => {},
    }
    const shell = new AgenticShell(mockFs as any)
    const out = (await shell.exec('grep hello /nonexistent.txt')).output
    expect(out).toMatch(/grep/)
    expect(out).toMatch(/nonexistent/)
  })

  it('grep -r still uses fs.grep for recursive search', async () => {
    let grepCalled = false
    const mockFs = {
      ls: async () => [],
      read: async () => ({ content: '' }),
      write: async () => {},
      delete: async () => {},
      grep: async (pattern: string) => {
        grepCalled = true
        return [
          { path: '/dir/file1.txt', line: 1, content: 'hello world' }
        ]
      },
      mkdir: async () => {},
      readStream: async function* (path: string) {
        throw new Error('Should not be called for recursive grep')
      }
    }
    const shell = new AgenticShell(mockFs as any)
    const out = (await shell.exec('grep -r hello /dir')).output
    expect(grepCalled).toBe(true)
    expect(out).toMatch(/hello world/)
  })

  it('grep with multiple paths uses streaming when readStream available', async () => {
    let streamCalled = false
    const fileContents: Record<string, string> = {
      '/file1.txt': 'hello\nworld\n',
      '/file2.txt': 'hello\n'
    }
    const mockFs = {
      ls: async () => [],
      read: async () => ({ content: '' }),
      write: async () => {},
      delete: async () => {},
      grep: async () => [],
      mkdir: async () => {},
      readStream: function (path: string) {
        streamCalled = true
        const content = fileContents[path]
        if (content === undefined) throw new Error('not found')
        const lines = content.split('\n')
        return {
          async *[Symbol.asyncIterator]() {
            for (const line of lines) yield line
          }
        }
      }
    }
    const shell = new AgenticShell(mockFs as any)
    const out = (await shell.exec('grep hello /file1.txt /file2.txt')).output
    expect(streamCalled).toBe(true)
    expect(out).toContain('/file1.txt:1: hello')
    expect(out).toContain('/file2.txt:1: hello')
  })
})
