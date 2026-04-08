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

describe('grep -l stdin identifier (task-1775578585704)', () => {
  it('grep -l with match in stdin returns (stdin)', async () => {
    const r = await new AgenticShell(makeFs('hello world')).exec('cat /f.txt | grep -l hello')
    expect(r.output).toBe('(stdin)')
    expect(r.exitCode).toBe(0)
  })

  it('grep -l with no match in stdin returns empty string', async () => {
    const r = await new AgenticShell(makeFs('hello world')).exec('cat /f.txt | grep -l nomatch')
    expect(r.output).toBe('')
    expect(r.exitCode).toBe(1)
  })

  it('grep -l with input redirection match returns (stdin)', async () => {
    const r = await new AgenticShell(makeFs('hello world')).exec('grep -l hello < /f.txt')
    expect(r.output).toBe('(stdin)')
    expect(r.exitCode).toBe(0)
  })

  it('grep -l with input redirection no match returns empty', async () => {
    const r = await new AgenticShell(makeFs('hello world')).exec('grep -l nomatch < /f.txt')
    expect(r.output).toBe('')
    expect(r.exitCode).toBe(1)
  })
})
