import { describe, it, expect } from 'vitest'
import { AgenticShell } from '../src/index.js'
import type { AgenticFileSystem } from 'agentic-filesystem'

function makeMockFs(overrides = {}): AgenticFileSystem {
  return {
    ls: async () => [],
    read: async () => ({ content: 'hello\nworld\n', error: null }),
    write: async () => {},
    delete: async () => {},
    grep: async () => [],
    mkdir: async () => {},
    ...overrides,
  } as unknown as AgenticFileSystem
}

describe('standalone grep exit code (m29)', () => {
  it('should return exitCode 1 for standalone grep no-match', async () => {
    const fs = makeMockFs({
      read: async () => ({ content: 'hello\nworld\n', error: null }),
      readStream: async function* () {
        yield 'hello'
        yield 'world'
      },
    })
    const shell = new AgenticShell(fs)
    const result = await shell.exec('grep "xyz" /f.txt')
    expect(result.exitCode).toBe(1)
    expect(result.output).toBe('')
  })

  it('should return exitCode 0 for standalone grep match', async () => {
    const fs = makeMockFs({
      read: async () => ({ content: 'hello\nworld\n', error: null }),
      readStream: async function* () {
        yield 'hello'
        yield 'world'
      },
    })
    const shell = new AgenticShell(fs)
    const result = await shell.exec('grep "hello" /f.txt')
    expect(result.exitCode).toBe(0)
    expect(result.output).toContain('hello')
  })

  it('should return exitCode 1 for standalone grep -i no-match', async () => {
    const fs = makeMockFs({
      read: async () => ({ content: 'hello\nworld\n', error: null }),
      readStream: async function* () {
        yield 'hello'
        yield 'world'
      },
    })
    const shell = new AgenticShell(fs)
    const result = await shell.exec('grep -i "xyz" /f.txt')
    expect(result.exitCode).toBe(1)
    expect(result.output).toBe('')
  })

  it('should return exitCode 1 for standalone grep on nonexistent file', async () => {
    const fs = makeMockFs({
      read: async () => ({ content: null, error: 'No such file or directory' }),
    })
    const shell = new AgenticShell(fs)
    const result = await shell.exec('grep "pat" /nonexistent')
    expect(result.exitCode).toBe(1)
  })

  it('should still return exitCode 0 for cat of empty file', async () => {
    const fs = makeMockFs({
      read: async () => ({ content: '', error: null }),
    })
    const shell = new AgenticShell(fs)
    const result = await shell.exec('cat /empty.txt')
    expect(result.exitCode).toBe(0)
  })
})
