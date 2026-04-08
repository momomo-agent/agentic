import { describe, it, expect, vi, beforeEach } from 'vitest'
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

describe('environment variables', () => {
  let sh: AgenticShell

  beforeEach(() => {
    const fs = makeMockFs()
    sh = new AgenticShell(fs)
  })

  it('echo $HOME returns built-in HOME', async () => {
    const { output } = await sh.exec('echo $HOME')
    expect(output).toBe('/')
  })

  it('echo ${HOME}/src works with brackets', async () => {
    const { output } = await sh.exec('echo ${HOME}/src')
    expect(output).toBe('//src')
  })

  it('undefined variable expands to empty string', async () => {
    const { output } = await sh.exec('echo $UNDEFINED_VAR')
    expect(output).toBe('')
  })

  it('$PWD reflects cwd after cd', async () => {
    const fs = makeMockFs({
      read: vi.fn().mockResolvedValue({ content: undefined, error: 'not found' }),
    })
    sh = new AgenticShell(fs)
    await sh.exec('cd /tmp')
    const { output } = await sh.exec('echo $PWD')
    expect(output).toBe('/tmp')
  })

  it('VAR=value assignment and retrieval', async () => {
    await sh.exec('MYVAR=hello')
    const { output } = await sh.exec('echo $MYVAR')
    expect(output).toBe('hello')
  })

  it('multiple variables in one command', async () => {
    await sh.exec('A=x')
    await sh.exec('B=y')
    const { output } = await sh.exec('echo $A $B')
    expect(output).toBe('x y')
  })

  it('variable substitution in pipe', async () => {
    await sh.exec('PAT=hello')
    const { output } = await sh.exec('echo hello world | grep $PAT')
    expect(output).toContain('hello world')
  })
})
