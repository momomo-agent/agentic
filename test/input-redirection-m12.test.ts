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

describe('DBB-m12: Input redirection (<)', () => {
  it('DBB-m12-006: grep with input redirection matches line', async () => {
    const fs = makeMockFs({
      read: vi.fn().mockResolvedValue({ content: 'hello\nworld', error: null }),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('grep hello < /data.txt')
    expect(r.exitCode).toBe(0)
    expect(r.output).toContain('hello')
    expect(r.output).not.toContain('world')
  })

  it('DBB-m12-007: input redirection file not found returns exitCode 1', async () => {
    const fs = makeMockFs({
      read: vi.fn().mockResolvedValue({ content: null, error: 'No such file or directory' }),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('grep pattern < /nonexistent.txt')
    expect(r.exitCode).toBe(1)
    expect(r.output).toContain('nonexistent.txt')
  })

  it('DBB-m12-008: input redirection with no match returns empty output, exitCode 1', async () => {
    const fs = makeMockFs({
      read: vi.fn().mockResolvedValue({ content: 'hello', error: null }),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('grep xyz < /data.txt')
    expect(r.exitCode).toBe(1)
    expect(r.output.trim()).toBe('')
  })

  it('DBB-m12-009: input redirection combined with output redirection', async () => {
    const written: Record<string, string> = {}
    const fs = makeMockFs({
      read: vi.fn().mockImplementation(async (path: string) => {
        if (path === '/input.txt') return { content: 'hello\nworld', error: null }
        return { content: written[path] ?? null, error: written[path] ? null : 'not found' }
      }),
      write: vi.fn().mockImplementation(async (path: string, content: string) => {
        written[path] = content
      }),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('grep hello < /input.txt > /output.txt')
    expect(r.exitCode).toBe(0)
    expect(written['/output.txt']).toContain('hello')
  })

  it('empty stdin: grep on empty file returns empty output, exitCode 1', async () => {
    const fs = makeMockFs({
      read: vi.fn().mockResolvedValue({ content: '', error: null }),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('grep pattern < /empty.txt')
    expect(r.exitCode).toBe(1)
    expect(r.output.trim()).toBe('')
  })
})
