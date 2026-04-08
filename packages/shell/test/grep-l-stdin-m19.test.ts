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

describe('DBB-m19-002: grep -l stdin identifier', () => {
  it('echo hello | grep -l hello returns (stdin)', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('echo hello | grep -l hello')
    expect(r.output).toBe('(stdin)')
    expect(r.exitCode).toBe(0)
  })

  it('echo hello | grep -l world returns empty string', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('echo hello | grep -l world')
    expect(r.output).toBe('')
    expect(r.exitCode).toBe(1)
  })

  it('grep -l in stdin mode with multiple lines matching returns (stdin)', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('echo "hello world" | grep -l hello')
    expect(r.output).toBe('(stdin)')
    expect(r.exitCode).toBe(0)
  })

  it('grep -l with -i in stdin mode works', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('echo HELLO | grep -l -i hello')
    expect(r.output).toBe('(stdin)')
    expect(r.exitCode).toBe(0)
  })

  it('grep -l with empty stdin returns empty string', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('echo "" | grep -l hello')
    expect(r.output).toBe('')
    expect(r.exitCode).toBe(1)
  })

  it('grep -c in stdin mode still returns count (not affected by -l fix)', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('echo "hello\nhello world\nbye" | grep -c hello')
    expect(r.output).toBe('2')
    expect(r.exitCode).toBe(0)
  })
})
