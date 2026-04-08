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

describe('Command substitution DBB coverage', () => {
  // DBB-m27-cmdsub-001: Basic $(cmd) substitution
  it('echo $(pwd) returns cwd', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('echo $(pwd)')
    expect(r.output).toBe('/')
    expect(r.exitCode).toBe(0)
  })

  // DBB-m27-cmdsub-002: Command substitution with cat
  it('cat $(echo /file.txt) reads the file', async () => {
    const fs = makeMockFs({
      read: vi.fn().mockResolvedValue({ content: 'world', error: null }),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('cat $(echo /file.txt)')
    expect(r.output).toBe('world')
  })

  // DBB-m27-cmdsub-003: Nested substitution depth 2
  it('nested $(echo $(echo nested)) depth 2', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('echo $(echo $(echo nested))')
    expect(r.output).toBe('nested')
    expect(r.exitCode).toBe(0)
  })

  // DBB-m27-cmdsub-004: Nested substitution depth 3
  it('nested $(echo $(echo $(echo deep))) depth 3', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('echo $(echo $(echo $(echo deep)))')
    expect(r.output).toBe('deep')
    expect(r.exitCode).toBe(0)
  })

  // DBB-m27-cmdsub-004b: Deep nesting still works via while loop
  it('nested depth 4 works via while loop iteration', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('echo $(echo $(echo $(echo $(echo too_deep))))')
    // While maxDepth=3 returns literals at depth 3, the while loop
    // re-processes remaining patterns at lower depth levels
    expect(r.output).toBe('too_deep')
  })

  // DBB-m27-cmdsub-005: Failed inner command expands to empty
  it('failed command substitutes empty string', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('echo before$(nonexistent)after')
    expect(r.output).toBe('beforeafter')
    expect(r.exitCode).toBe(0)
  })

  // DBB-m27-cmdsub-006: Command substitution with env vars
  it('$(echo $GREET) with env var', async () => {
    const sh = new AgenticShell(makeMockFs())
    await sh.exec('GREET=hello')
    const r = await sh.exec('echo $(echo $GREET)')
    expect(r.output).toBe('hello')
  })

  // DBB-m27-cmdsub-007: Multiple substitutions in one command
  it('multiple substitutions: echo $(echo a) $(echo b) $(echo c)', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('echo $(echo a) $(echo b) $(echo c)')
    expect(r.output).toBe('a b c')
    expect(r.exitCode).toBe(0)
  })

  // DBB-m27-cmdsub-008: Substitution with pipe inside
  it('$(echo "hello world" | grep hello)', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('echo $(echo hello world | grep hello)')
    expect(r.output).toBe('hello world')
  })

  // DBB-m27-cmdsub-009: Empty command substitution
  it('$(echo "") expands to empty', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('echo $(echo "")')
    expect(r.output).toBe('')
  })

  // DBB-m27-cmdsub-010: Substitution preserves surrounding text
  it('prefix$(echo middle)suffix', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('echo prefix$(echo middle)suffix')
    expect(r.output).toBe('prefixmiddlesuffix')
  })

  // Backtick syntax tests
  it('backtick: echo `pwd` returns cwd', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('echo `pwd`')
    expect(r.output).toBe('/')
    expect(r.exitCode).toBe(0)
  })

  it('backtick: echo `echo hello` returns hello', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('echo `echo hello`')
    expect(r.output).toBe('hello')
  })

  it('unclosed backtick treated as literal', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('echo `unclosed')
    // Unclosed backtick: no closing backtick found, treated as literal
    expect(r.output).toContain('`unclosed')
  })

  // Unclosed $( treated as literal
  it('unclosed $( treated as literal', async () => {
    const sh = new AgenticShell(makeMockFs())
    const r = await sh.exec('echo $(unclosed')
    // No matching ), loop breaks, treated as literal
    expect(r.output).toContain('$(unclosed')
  })
})
