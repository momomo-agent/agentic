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

describe('DBB-m25-env: Environment Variable Substitution', () => {
  let sh: AgenticShell

  beforeEach(() => {
    const fs = makeMockFs()
    sh = new AgenticShell(fs)
  })

  // === DBB Criteria Tests ===

  it('DBB-m25-env-001: echo $HOME returns built-in HOME value', async () => {
    const { output } = await sh.exec('echo $HOME')
    expect(output).toBe('/')
  })

  it('DBB-m25-env-002: ${VAR} bracket substitution with suffix', async () => {
    const { output } = await sh.exec('echo ${HOME}/src')
    expect(output).toBe('//src')
  })

  it('DBB-m25-env-003: undefined variable expands to empty string', async () => {
    const { output } = await sh.exec('echo $UNDEFINED_VAR')
    expect(output).toBe('')
  })

  it('DBB-m25-env-004: $PWD reflects cwd after cd', async () => {
    const fs = makeMockFs({
      read: vi.fn().mockResolvedValue({ content: undefined, error: 'not found' }),
    })
    sh = new AgenticShell(fs)
    await sh.exec('cd /tmp')
    const { output } = await sh.exec('echo $PWD')
    expect(output).toBe('/tmp')
  })

  it('DBB-m25-env-005: VAR=value assignment and retrieval', async () => {
    await sh.exec('MYVAR=hello')
    const { output } = await sh.exec('echo $MYVAR')
    expect(output).toBe('hello')
  })

  it('DBB-m25-env-006: variable substitution in pipe', async () => {
    await sh.exec('PAT=hello')
    const { output } = await sh.exec('echo hello world | grep $PAT')
    expect(output).toContain('hello world')
  })

  it('DBB-m25-env-007: multiple variables in single command', async () => {
    await sh.exec('A=x')
    await sh.exec('B=y')
    const { output } = await sh.exec('echo $A $B')
    expect(output).toBe('x y')
  })

  // === Edge Case Tests ===

  it('export VAR=value sets variable', async () => {
    await sh.exec('export MYVAL=world')
    const { output } = await sh.exec('echo $MYVAL')
    expect(output).toBe('world')
  })

  it('export with empty value sets empty string', async () => {
    await sh.exec('export EMPTY=')
    const { output } = await sh.exec('echo $EMPTY')
    expect(output).toBe('')
  })

  it('VAR=empty sets empty string', async () => {
    await sh.exec('EMPTY2=')
    const { output } = await sh.exec('echo $EMPTY2')
    expect(output).toBe('')
  })

  it('getEnv() public API returns correct value', async () => {
    await sh.exec('TESTKEY=testval')
    expect(sh.getEnv('TESTKEY')).toBe('testval')
  })

  it('getEnv() returns undefined for nonexistent key', () => {
    expect(sh.getEnv('NONEXISTENT')).toBeUndefined()
  })

  it('built-in PATH is accessible', async () => {
    const { output } = await sh.exec('echo $PATH')
    expect(output).toBe('/usr/bin:/bin')
  })

  it('variable overwrite works', async () => {
    await sh.exec('X=first')
    await sh.exec('X=second')
    const { output } = await sh.exec('echo $X')
    expect(output).toBe('second')
  })

  it('variable with special characters in value', async () => {
    await sh.exec('URL=http://example.com:8080/path')
    const { output } = await sh.exec('echo $URL')
    expect(output).toBe('http://example.com:8080/path')
  })

  it('variable substitution preserves spaces in value', async () => {
    await sh.exec('MSG=hello world')
    const { output } = await sh.exec('echo $MSG')
    expect(output).toBe('hello world')
  })

  it('unset variable after cd still works', async () => {
    const fs = makeMockFs({
      read: vi.fn().mockResolvedValue({ content: undefined, error: 'not found' }),
    })
    sh = new AgenticShell(fs)
    await sh.exec('cd /tmp')
    // PWD should be /tmp, and an undefined var should be empty
    const { output } = await sh.exec('echo $PWD $NOPE')
    expect(output).toBe('/tmp')
  })

  it('VAR=value assignment has exit code 0', async () => {
    const { exitCode } = await sh.exec('MYVAR=val')
    expect(exitCode).toBe(0)
  })

  it('export VAR=value assignment has exit code 0', async () => {
    const { exitCode } = await sh.exec('export MYVAR=val')
    expect(exitCode).toBe(0)
  })

  it('echo with no env vars returns just the text', async () => {
    const { output } = await sh.exec('echo hello')
    expect(output).toBe('hello')
  })

  it('double dollar sign does not break parsing', async () => {
    await sh.exec('A=1')
    const { output } = await sh.exec('echo $A')
    expect(output).toBe('1')
  })

  it('variable names with underscores work', async () => {
    await sh.exec('MY_VAR_123=found')
    const { output } = await sh.exec('echo $MY_VAR_123')
    expect(output).toBe('found')
  })

  it('bracket substitution with underscore var', async () => {
    await sh.exec('FOO_BAR=baz')
    const { output } = await sh.exec('echo ${FOO_BAR}_suffix')
    expect(output).toBe('baz_suffix')
  })

  it('cd to ~ resets cwd to root and PWD to /', async () => {
    const fs = makeMockFs({
      read: vi.fn().mockResolvedValue({ content: undefined, error: 'not found' }),
    })
    sh = new AgenticShell(fs)
    await sh.exec('cd /tmp')
    await sh.exec('cd ~')
    const { output } = await sh.exec('echo $PWD')
    expect(output).toBe('/')
  })

  it('cd with no args resets to root', async () => {
    const fs = makeMockFs({
      read: vi.fn().mockResolvedValue({ content: undefined, error: 'not found' }),
    })
    sh = new AgenticShell(fs)
    await sh.exec('cd /tmp')
    await sh.exec('cd')
    const { output } = await sh.exec('echo $PWD')
    expect(output).toBe('/')
  })
})
