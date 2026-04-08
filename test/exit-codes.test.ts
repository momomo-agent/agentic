import { describe, it, expect, vi } from 'vitest'
import { AgenticShell } from '../src/index'
import type { AgenticFileSystem } from 'agentic-filesystem'

function makeFs(overrides = {}): AgenticFileSystem {
  return {
    ls: vi.fn().mockResolvedValue([]),
    read: vi.fn().mockResolvedValue({ content: '', error: null }),
    write: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    grep: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as AgenticFileSystem
}

describe('DBB-m12-001: success returns exitCode 0', () => {
  it('ls returns exitCode 0', async () => {
    const fs = makeFs({ ls: vi.fn().mockResolvedValue([{ name: 'file.txt', type: 'file' }]) })
    const result = await new AgenticShell(fs).exec('ls /')
    expect(result.exitCode).toBe(0)
    expect(typeof result.output).toBe('string')
  })

  it('cat existing file returns exitCode 0 with content', async () => {
    const fs = makeFs({ read: vi.fn().mockResolvedValue({ content: 'hello', error: null }) })
    const result = await new AgenticShell(fs).exec('cat /file.txt')
    expect(result.exitCode).toBe(0)
    expect(result.output).toContain('hello')
  })
})

describe('DBB-m12-002: error returns exitCode 1', () => {
  it('cat nonexistent file returns exitCode 1', async () => {
    const fs = makeFs({ read: vi.fn().mockResolvedValue({ content: null, error: 'No such file or directory' }) })
    const result = await new AgenticShell(fs).exec('cat /nonexistent')
    expect(result.exitCode).toBe(1)
    expect(result.output).toBeTruthy()
  })
})

describe('DBB-m12-003: misuse returns exitCode 2', () => {
  it('grep with no pattern returns exitCode 2', async () => {
    const result = await new AgenticShell(makeFs()).exec('grep')
    expect(result.exitCode).toBe(2)
  })

  it('unknown command returns exitCode 2', async () => {
    const result = await new AgenticShell(makeFs()).exec('foobar')
    expect(result.exitCode).toBe(2)
  })
})

describe('DBB-m12-004: pipe exit code reflects failing stage', () => {
  it('cat nonexistent | grep x returns non-zero', async () => {
    const fs = makeFs({ read: vi.fn().mockResolvedValue({ content: null, error: 'No such file or directory' }) })
    const result = await new AgenticShell(fs).exec('cat /nonexistent | grep x')
    expect(result.exitCode).not.toBe(0)
  })
})

describe('DBB-m12-005: output field always present', () => {
  it('success result has string output and number exitCode', async () => {
    const result = await new AgenticShell(makeFs()).exec('ls /')
    expect(typeof result.output).toBe('string')
    expect(typeof result.exitCode).toBe('number')
  })

  it('error result has string output and number exitCode', async () => {
    const fs = makeFs({ read: vi.fn().mockResolvedValue({ content: null, error: 'No such file or directory' }) })
    const result = await new AgenticShell(fs).exec('cat /missing')
    expect(typeof result.output).toBe('string')
    expect(typeof result.exitCode).toBe('number')
  })

  it('empty command returns empty output and exitCode 0', async () => {
    const result = await new AgenticShell(makeFs()).exec('')
    expect(result.output).toBe('')
    expect(result.exitCode).toBe(0)
  })
})
