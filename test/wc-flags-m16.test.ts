import { describe, it, expect, vi } from 'vitest'
import { AgenticShell } from '../src/index'
import type { AgenticFileSystem } from 'agentic-filesystem'

function makeMockFs(content: string): AgenticFileSystem {
  return {
    ls: vi.fn().mockResolvedValue([]),
    read: vi.fn().mockResolvedValue({ content, error: null }),
    write: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    grep: vi.fn().mockResolvedValue([]),
  } as unknown as AgenticFileSystem
}

describe('wc -l flag (task-1775573404564)', () => {
  it('returns line count with filename', async () => {
    const sh = new AgenticShell(makeMockFs('a\nb\nc'))
    const r = await sh.exec('wc -l /f.txt')
    expect(r.output).toBe('3\t/f.txt')
  })

  it('returns 0 for empty file', async () => {
    const sh = new AgenticShell(makeMockFs(''))
    const r = await sh.exec('wc -l /empty.txt')
    expect(r.output).toBe('0\t/empty.txt')
  })

  it('wc -w returns word count with filename', async () => {
    const sh = new AgenticShell(makeMockFs('hello world'))
    const r = await sh.exec('wc -w /f.txt')
    expect(r.output).toBe('2\t/f.txt')
  })

  it('wc -c returns char count with filename', async () => {
    const sh = new AgenticShell(makeMockFs('abc'))
    const r = await sh.exec('wc -c /f.txt')
    expect(r.output).toBe('3\t/f.txt')
  })
})
