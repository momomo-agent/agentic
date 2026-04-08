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

describe('$(cmd) command substitution', () => {
  it('echo $(pwd) returns cwd', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('echo $(pwd)')
    expect(r.output).toBe('/')
    expect(r.exitCode).toBe(0)
  })

  it('echo $(echo hello) returns hello', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('echo $(echo hello)')
    expect(r.output).toBe('hello')
    expect(r.exitCode).toBe(0)
  })

  it('cat $(echo /file.txt) reads the file', async () => {
    const fs = makeMockFs({
      read: vi.fn().mockResolvedValue({ content: 'data', error: null }),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('cat $(echo /file.txt)')
    expect(r.output).toBe('data')
  })

  it('failed inner command substitutes empty string', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('echo $(nonexistent_cmd)')
    expect(r.output).toBe('')
    expect(r.exitCode).toBe(0)
  })

  it('multiple substitutions in one command', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('echo $(echo a) and $(echo b)')
    expect(r.output).toBe('a and b')
    expect(r.exitCode).toBe(0)
  })

  it('preserves text around substitution', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('echo prefix$(echo middle)suffix')
    expect(r.output).toBe('prefixmiddlesuffix')
  })

  it('handles nested substitution depth 2', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('echo $(echo $(echo nested))')
    expect(r.output).toBe('nested')
  })

  it('handles nested substitution depth 3', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('echo $(echo $(echo $(echo deep)))')
    expect(r.output).toBe('deep')
  })

  it('stops recursion at max depth without crashing', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('echo $(echo $(echo $(echo $(echo too-deep))))')
    expect(r.exitCode).toBe(0)
  })

  it('handles empty command substitution', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('echo $(echo "")')
    expect(r.output).toBe('')
  })
})

describe('backtick command substitution', () => {
  it('supports backtick command substitution', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('echo `echo hello`')
    expect(r.output).toBe('hello')
  })

  it('handles unclosed backtick without crashing', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('echo `unclosed')
    expect(r.exitCode).toBe(0)
  })
})

describe('command substitution with env and pipes', () => {
  it('substitutes env vars inside command substitution', async () => {
    const sh = new AgenticShell(makeMockFs())
    sh.setEnv('GREET', 'hello')
    const r = await sh.exec('echo $(echo $GREET)')
    expect(r.output).toBe('hello')
  })

  it('handles pipe inside command substitution', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('echo $(echo "hello world" | grep hello)')
    expect(r.output).toBe('hello world')
  })
})
