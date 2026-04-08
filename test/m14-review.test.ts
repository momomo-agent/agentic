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

async function run(sh: AgenticShell, cmd: string): Promise<string> {
  return (await sh.exec(cmd)).output
}

// task-1775570877456: cp without -r on directory
describe('cp without -r on directory', () => {
  it('returns is-a-directory error when src is a dir', async () => {
    const fs = makeMockFs({ ls: vi.fn().mockResolvedValue([{ name: 'file.txt', type: 'file' }]) })
    const sh = new AgenticShell(fs)
    const out = await run(sh, 'cp /dir /dest')
    expect(out).toBe("cp: /dir: -r not specified; omitting directory")
  })

  it('copies file when src is not a directory', async () => {
    const lsMock = vi.fn().mockRejectedValue(new Error('not a dir'))
    const readMock = vi.fn().mockResolvedValue({ content: 'hello', error: null })
    const writeMock = vi.fn().mockResolvedValue(undefined)
    const fs = makeMockFs({ ls: lsMock, read: readMock, write: writeMock })
    const sh = new AgenticShell(fs)
    const out = await run(sh, 'cp /file.txt /dest.txt')
    expect(out).toBe('')
    expect(writeMock).toHaveBeenCalledWith('/dest.txt', 'hello')
  })

  it('cp -r on directory performs recursive copy', async () => {
    const lsMock = vi.fn().mockResolvedValue([{ name: 'a.txt', type: 'file' }])
    const readMock = vi.fn().mockResolvedValue({ content: 'data', error: null })
    const writeMock = vi.fn().mockResolvedValue(undefined)
    const fs = makeMockFs({ ls: lsMock, read: readMock, write: writeMock })
    const sh = new AgenticShell(fs)
    const out = await run(sh, 'cp -r /dir /dest')
    expect(out).toBe('')
  })
})

// task-1775570891635: wc output format and empty file count
describe('wc output format and empty file count', () => {
  it('wc on empty file returns 0 0 0', async () => {
    const fs = makeMockFs({ read: vi.fn().mockResolvedValue({ content: '', error: null }) })
    const sh = new AgenticShell(fs)
    const out = await run(sh, 'wc /empty')
    expect(out).toMatch(/^0\s+0\s+0/)
  })

  it('wc -l returns only line count', async () => {
    const fs = makeMockFs({ read: vi.fn().mockResolvedValue({ content: 'hello\nworld', error: null }) })
    const sh = new AgenticShell(fs)
    expect(await run(sh, 'wc -l /file')).toMatch(/^2\t\/file$/)
  })

  it('wc -w returns only word count', async () => {
    const fs = makeMockFs({ read: vi.fn().mockResolvedValue({ content: 'hello world', error: null }) })
    const sh = new AgenticShell(fs)
    expect(await run(sh, 'wc -w /file')).toMatch(/^2\t\/file$/)
  })

  it('wc -c returns only char count', async () => {
    const fs = makeMockFs({ read: vi.fn().mockResolvedValue({ content: 'hello', error: null }) })
    const sh = new AgenticShell(fs)
    expect(await run(sh, 'wc -c /file')).toMatch(/^5\t\/file$/)
  })

  it('wc on non-empty file returns correct counts', async () => {
    const fs = makeMockFs({ read: vi.fn().mockResolvedValue({ content: 'hello\nworld', error: null }) })
    const sh = new AgenticShell(fs)
    const out = await run(sh, 'wc /file')
    expect(out).toMatch(/^2\s+2\s+11/)
  })
})
