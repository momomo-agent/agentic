import { describe, it, expect, vi } from 'vitest'
import { AgenticShell } from '../src/index'
import type { AgenticFileSystem } from 'agentic-filesystem'

function makeFs(content = 'hello world'): AgenticFileSystem {
  return {
    ls: vi.fn().mockResolvedValue([]),
    read: vi.fn().mockResolvedValue({ content, error: null }),
    write: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    grep: vi.fn().mockResolvedValue([]),
  } as unknown as AgenticFileSystem
}

describe('DBB-m15-002: grep stdin no-match returns exitCode 1', () => {
  it('cat | grep nomatch returns exitCode 1 with empty output', async () => {
    const r = await new AgenticShell(makeFs('hello world')).exec('cat /f.txt | grep nomatch')
    expect(r.exitCode).toBe(1)
    expect(r.output).toBe('')
  })

  it('cat | grep match returns exitCode 0', async () => {
    const r = await new AgenticShell(makeFs('hello world')).exec('cat /f.txt | grep hello')
    expect(r.exitCode).toBe(0)
  })

  it('grep with input redirection no-match returns exitCode 1', async () => {
    const r = await new AgenticShell(makeFs('hello world')).exec('grep nomatch < /f.txt')
    expect(r.exitCode).toBe(1)
  })
})
