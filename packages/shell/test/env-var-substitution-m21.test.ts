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

describe('$VAR / ${VAR} environment variable substitution', () => {
  it('substitutes $VAR in echo', async () => {
    const sh = new AgenticShell(makeMockFs())
    sh.setEnv('HOME', '/home/user')
    const r = await sh.exec('echo $HOME')
    expect(r.output).toBe('/home/user')
    expect(r.exitCode).toBe(0)
  })

  it('substitutes ${VAR} in echo', async () => {
    const sh = new AgenticShell(makeMockFs())
    sh.setEnv('X', 'hello')
    const r = await sh.exec('echo ${X}')
    expect(r.output).toBe('hello')
    expect(r.exitCode).toBe(0)
  })

  it('unset var expands to empty string', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('echo $UNDEFINED')
    expect(r.output).toBe('')
    expect(r.exitCode).toBe(0)
  })

  it('substitutes $VAR in file path for cat', async () => {
    const fs = makeMockFs({
      read: vi.fn().mockResolvedValue({ content: 'file content', error: null }),
    })
    const sh = new AgenticShell(fs)
    sh.setEnv('F', '/a.txt')
    const r = await sh.exec('cat $F')
    expect(r.output).toBe('file content')
    expect(r.exitCode).toBe(0)
  })

  it('substitutes ${VAR} in ls path', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([{ name: 'foo.txt', type: 'file' }]),
    })
    const sh = new AgenticShell(fs)
    sh.setEnv('DIR', '/tmp')
    const r = await sh.exec('ls ${DIR}')
    expect(r.output).toContain('foo.txt')
    expect(r.exitCode).toBe(0)
  })
})
