import { describe, it, expect } from 'vitest'
import { AgenticShell } from '../src/index'

function makeFs(overrides: Record<string, any> = {}) {
  return {
    read: async (p: string) => ({ content: 'hello\nworld\n', error: undefined }),
    write: async () => {},
    ls: async () => [],
    delete: async () => {},
    grep: async () => [],
    ...overrides,
  }
}

// Task 1: grep streaming fallback indication
describe('grep streaming fallback indication', () => {
  it('warns when readStream unavailable', async () => {
    const fs = makeFs({
      ls: async () => [{ name: 'file.txt', type: 'file' as const }],
      read: async () => ({ content: 'foo\nbar\n' }),
    })
    const shell = new AgenticShell(fs as any)
    const out = (await shell.exec('grep foo /file.txt')).output
    expect(out).toMatch(/^grep: warning: streaming unavailable/)
  })

  it('no warning when readStream available', async () => {
    async function* lines() { yield 'foo'; yield 'bar' }
    const fs = makeFs({
      readStream: (_p: string) => lines(),
      read: async () => ({ content: 'foo\nbar\n' }),
    })
    const shell = new AgenticShell(fs as any)
    const out = (await shell.exec('grep foo /file.txt')).output
    expect(out).not.toMatch(/warning/)
  })

  it('empty file with no matches returns warning only', async () => {
    const fs = makeFs({
      read: async () => ({ content: '' }),
    })
    const shell = new AgenticShell(fs as any)
    const out = (await shell.exec('grep foo /file.txt')).output
    expect(out).toMatch(/^grep: warning: streaming unavailable/)
  })
})

// Task 2: AgenticFileSystem streaming interface type safety
describe('AgenticFileSystem streaming interface type safety', () => {
  it('uses readStream when available (no cast errors at runtime)', async () => {
    const collected: string[] = []
    async function* streamLines() { yield 'match line'; yield 'other' }
    const fs = makeFs({
      readStream: (_p: string) => streamLines(),
    })
    const shell = new AgenticShell(fs as any)
    const out = (await shell.exec('grep match /file.txt')).output
    expect(out).toContain('match line')
    expect(out).not.toContain('warning')
  })

  it('falls back gracefully when readStream absent', async () => {
    const fs = makeFs({
      read: async () => ({ content: 'match line\nother\n' }),
    })
    const shell = new AgenticShell(fs as any)
    const out = (await shell.exec('grep match /file.txt')).output
    expect(out).toContain('match line')
  })
})

// Task 3: fs adapter contract validation at shell init
describe('fs adapter contract validation at shell init', () => {
  it('throws when grep is missing', () => {
    const fs = makeFs({ grep: undefined })
    expect(() => new AgenticShell(fs as any)).toThrow(/grep/)
  })

  it('throws listing all missing methods', () => {
    const fs = { read: async () => ({ content: '' }) }
    expect(() => new AgenticShell(fs as any)).toThrow(/write.*ls.*delete.*grep|grep.*write/)
  })

  it('constructs without error with valid full fs', () => {
    const fs = makeFs()
    expect(() => new AgenticShell(fs as any)).not.toThrow()
  })

  it('constructs without error when optional methods absent', () => {
    const fs = makeFs() // no mkdir, no readStream
    expect(() => new AgenticShell(fs as any)).not.toThrow()
  })

  it('throws with message listing missing method name', () => {
    const fs = makeFs({ write: undefined, delete: undefined })
    expect(() => new AgenticShell(fs as any)).toThrow(/write/)
  })
})
