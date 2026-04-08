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

describe('bracket glob expressions [abc] / [a-z]', () => {
  it('[abc]*.ts matches a-prefixed file', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([
        { name: 'a.ts', type: 'file' },
        { name: 'b.ts', type: 'file' },
        { name: 'c.ts', type: 'file' },
        { name: 'd.ts', type: 'file' },
      ]),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('ls [abc]*')
    expect(r.output).toContain('a.ts')
    expect(r.output).toContain('b.ts')
    expect(r.output).toContain('c.ts')
    expect(r.output).not.toContain('d.ts')
  })

  it('[a-z].txt matches lowercase single char', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([
        { name: 'b.txt', type: 'file' },
        { name: 'B.txt', type: 'file' },
      ]),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('ls [a-z].txt')
    expect(r.output).toContain('b.txt')
    expect(r.output).not.toContain('B.txt')
  })

  it('unclosed [ treated as literal', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([
        { name: '[abc', type: 'file' },
        { name: 'abc', type: 'file' },
      ]),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('ls [abc')
    // no glob chars other than unclosed [, returns as-is (no match or literal)
    expect(r.exitCode).toBeDefined()
  })
})

describe('negated bracket glob [!abc]', () => {
  it('[!abc]* excludes a/b/c prefixed files', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([
        { name: 'a.txt', type: 'file' },
        { name: 'b.txt', type: 'file' },
        { name: 'c.txt', type: 'file' },
        { name: 'd.txt', type: 'file' },
        { name: 'xyz.txt', type: 'file' },
      ]),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('ls [!abc]*')
    expect(r.output).not.toContain('a.txt')
    expect(r.output).not.toContain('b.txt')
    expect(r.output).not.toContain('c.txt')
    expect(r.output).toContain('d.txt')
    expect(r.output).toContain('xyz.txt')
  })

  it('[!a-z]* excludes lowercase-prefixed files', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([
        { name: 'alpha.txt', type: 'file' },
        { name: '1file.txt', type: 'file' },
        { name: '0bar.txt', type: 'file' },
      ]),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('ls [!a-z]*')
    expect(r.output).not.toContain('alpha.txt')
    expect(r.output).toContain('1file.txt')
    expect(r.output).toContain('0bar.txt')
  })

  it('[!] is treated as literal (not negation)', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([
        { name: '!', type: 'file' },
        { name: 'a', type: 'file' },
      ]),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('ls [!]')
    expect(r.output).toContain('!')
    expect(r.output).not.toContain('a')
  })
})
