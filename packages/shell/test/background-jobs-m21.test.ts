import { describe, it, expect, vi } from 'vitest'
import { AgenticShell } from '../src/index'
import type { AgenticFileSystem } from 'agentic-filesystem'

function makeMockFs(overrides = {}): AgenticFileSystem {
  return {
    ls: vi.fn().mockResolvedValue([]),
    read: vi.fn().mockResolvedValue({ content: 'hello\nworld', error: null }),
    write: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    grep: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as AgenticFileSystem
}

describe('background jobs', () => {
  it('returns job id for & command', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('echo hello &')
    expect(r.exitCode).toBe(0)
    expect(r.output).toBe('[1] 1')
  })

  it('exec returns immediately without waiting', async () => {
    let resolved = false
    const fs = makeMockFs({
      read: vi.fn().mockImplementation(() => new Promise(res => setTimeout(() => { resolved = true; res({ content: 'x', error: null }) }, 50)))
    })
    const sh = new AgenticShell(fs)
    await sh.exec('cat /file &')
    expect(resolved).toBe(false)
  })

  it('jobs lists running jobs', async () => {
    const sh = new AgenticShell(makeMockFs())
    await sh.exec('echo hello &')
    const r = await sh.exec('jobs')
    expect(r.output).toContain('[1]')
    expect(r.output).toContain('echo hello')
  })

  it('jobs returns empty string when no jobs', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('jobs')
    expect(r.output).toBe('')
    expect(r.exitCode).toBe(0)
  })

  it('fg awaits job and returns output', async () => {
    const sh = new AgenticShell(makeMockFs())
    await sh.exec('echo hi &')
    const r = await sh.exec('fg 1')
    expect(r.output).toBe('hi')
  })

  it('fg removes job from list after completion', async () => {
    const sh = new AgenticShell(makeMockFs())
    await sh.exec('echo hi &')
    await sh.exec('fg 1')
    const r = await sh.exec('jobs')
    expect(r.output).toBe('')
  })

  it('fg with invalid id returns error', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('fg 99')
    expect(r.output).toContain('no such job')
  })

  it('fg with %N syntax works', async () => {
    const sh = new AgenticShell(makeMockFs())
    await sh.exec('echo hi &')
    const r = await sh.exec('fg %1')
    expect(r.output).toBe('hi')
  })

  it('bg with valid id is no-op', async () => {
    const sh = new AgenticShell(makeMockFs())
    await sh.exec('echo hi &')
    const r = await sh.exec('bg 1')
    expect(r.output).toBe('')
    expect(r.exitCode).toBe(0)
  })

  it('bg with invalid id returns error', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('bg 99')
    expect(r.output).toContain('no such job')
  })

  it('pipeline with trailing & runs in background', async () => {
    const sh = new AgenticShell(makeMockFs({
      grep: vi.fn().mockResolvedValue([{ path: '/f', line: 1, content: 'hello' }])
    }))
    const r = await sh.exec('cat /f | grep hello &')
    expect(r.exitCode).toBe(0)
    expect(r.output).toBe('[1] 1')
  })

  it('empty command with & returns error', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('&')
    expect(r.exitCode).toBe(1)
    expect(r.output).toContain('missing command')
  })

  it('fg without argument when no jobs returns error', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('fg')
    expect(r.output).toBe('fg: current: no such job')
  })

  it('fg without argument uses most recent job', async () => {
    const sh = new AgenticShell(makeMockFs())
    await sh.exec('echo first &')
    await sh.exec('echo second &')
    const r = await sh.exec('fg')
    expect(r.output).toBe('second')
  })

  it('multiple background jobs get sequential IDs', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r1 = await sh.exec('echo a &')
    expect(r1.output).toBe('[1] 1')
    const r2 = await sh.exec('echo b &')
    expect(r2.output).toBe('[2] 2')
  })
})
