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

describe('DBB-m12-010: glob pattern support in ls and grep', () => {
  it('DBB-m12-010: ls *.ts lists only .ts files', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([
        { name: 'a.ts', type: 'file' },
        { name: 'b.ts', type: 'file' },
        { name: 'c.js', type: 'file' },
      ]),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('ls *.ts')
    expect(r.output).toBe('a.ts\nb.ts')
    expect(r.exitCode).toBe(0)
  })

  it('DBB-m12-011: ls *.ts with no .ts files returns error, exitCode 1', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([{ name: 'c.js', type: 'file' }]),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('ls *.ts')
    expect(r.output).toContain('No such file or directory')
    expect(r.exitCode).toBe(1)
  })

  it('DBB-m12-012: grep hello *.ts searches only .ts files', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([
        { name: 'a.ts', type: 'file' },
        { name: 'b.js', type: 'file' },
      ]),
      read: vi.fn().mockImplementation(async (path: string) => {
        if (path.endsWith('a.ts')) return { content: 'hello world', error: null }
        return { content: 'no match', error: null }
      }),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('grep hello *.ts')
    expect(r.output).toContain('hello world')
    expect(r.output).not.toContain('no match')
  })

  it('DBB-m12-013: grep pattern *.ts with no .ts files returns error, exitCode 1', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([{ name: 'c.js', type: 'file' }]),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('grep hello *.ts')
    expect(r.output).toContain('No such file or directory')
    expect(r.exitCode).toBe(1)
  })

  it('DBB-m12-014: ls a?.ts matches single-char wildcard', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([
        { name: 'a1.ts', type: 'file' },
        { name: 'a2.ts', type: 'file' },
        { name: 'ab.ts', type: 'file' },
        { name: 'abc.ts', type: 'file' },
      ]),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('ls a?.ts')
    expect(r.output).toContain('a1.ts')
    expect(r.output).toContain('a2.ts')
    expect(r.output).toContain('ab.ts')
    expect(r.output).not.toContain('abc.ts')
  })
})
