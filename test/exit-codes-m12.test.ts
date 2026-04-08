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

describe('DBB-m12: Exit codes for all commands', () => {
  it('DBB-m12-001: success returns exitCode 0', async () => {
    const fs = makeMockFs({ ls: vi.fn().mockResolvedValue([{ name: 'file.txt', type: 'file' }]) })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('ls /')
    expect(r.exitCode).toBe(0)
    expect(typeof r.output).toBe('string')
  })

  it('DBB-m12-002: cat nonexistent file returns exitCode 1', async () => {
    const fs = makeMockFs({ read: vi.fn().mockResolvedValue({ content: null, error: 'No such file or directory' }) })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('cat /nonexistent')
    expect(r.exitCode).toBe(1)
    expect(r.output).toContain('nonexistent')
  })

  it('DBB-m12-003: grep with no pattern returns exitCode 2', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('grep')
    expect(r.exitCode).toBe(2)
  })

  it('DBB-m12-004: pipe with failing left side returns non-zero exitCode', async () => {
    const fs = makeMockFs({ read: vi.fn().mockResolvedValue({ content: null, error: 'No such file or directory' }) })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('cat /nonexistent | grep pattern')
    expect(r.exitCode).not.toBe(0)
  })

  it('DBB-m12-005: every result has .output string and .exitCode number', async () => {
    const sh = new AgenticShell(makeMockFs())
    const commands = ['ls /', 'pwd', 'echo hello', 'cat /missing', 'grep']
    for (const cmd of commands) {
      const r = await sh.exec(cmd)
      expect(typeof r.output).toBe('string')
      expect(typeof r.exitCode).toBe('number')
    }
  })

  it('empty command returns exitCode 0 with empty output', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('')
    expect(r).toEqual({ output: '', exitCode: 0 })
  })

  it('command not found returns exitCode 2', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('foobar')
    expect(r.exitCode).toBe(2)
    expect(r.output).toContain('command not found')
  })

  it('successful pipe returns exitCode 0', async () => {
    const fs = makeMockFs({
      read: vi.fn().mockResolvedValue({ content: 'hello\nworld', error: null }),
      grep: vi.fn().mockResolvedValue([{ path: '/f', line: 1, content: 'hello' }]),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('cat /file.txt | grep hello')
    expect(r.exitCode).toBe(0)
  })

  it('output redirection returns exitCode 0 on success', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('echo hello > /out.txt')
    expect(r.exitCode).toBe(0)
    expect(r.output).toBe('')
  })

  it('append redirection returns exitCode 0 on success', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('echo hello >> /out.txt')
    expect(r.exitCode).toBe(0)
  })
})
