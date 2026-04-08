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

describe('DBB-m15-004: 3+ stage pipe exit code propagation', () => {
  it('last grep no-match returns exitCode 1', async () => {
    const r = await new AgenticShell(makeFs('hello world')).exec('cat /f.txt | grep hello | grep nomatch')
    expect(r.exitCode).toBe(1)
  })

  it('all stages match returns exitCode 0', async () => {
    const r = await new AgenticShell(makeFs('hello world')).exec('cat /f.txt | grep hello | grep world')
    expect(r.exitCode).toBe(0)
  })

  it('middle stage no-match propagates exitCode 1', async () => {
    const r = await new AgenticShell(makeFs('hello world')).exec('cat /f.txt | grep nomatch | grep hello')
    expect(r.exitCode).toBe(1)
  })
})
