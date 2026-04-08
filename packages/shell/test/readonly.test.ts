import { describe, it, expect, vi } from 'vitest'
import { AgenticShell } from '../src/index'
import type { AgenticFileSystem } from 'agentic-filesystem'

function makeMockFs(readOnly = false, overrides = {}): AgenticFileSystem {
  return {
    ls: vi.fn().mockResolvedValue([]),
    read: vi.fn().mockResolvedValue({ content: 'data', error: null }),
    write: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    grep: vi.fn().mockResolvedValue([{ path: '/f.txt', line: 1, content: 'x' }]),
    readOnly,
    ...overrides,
  } as unknown as AgenticFileSystem
}

// DBB-004 & DBB-005: write commands blocked in readOnly mode
describe('DBB-004/005: readOnly blocks write commands', () => {
  it('touch returns Permission denied', async () => {
    const sh = new AgenticShell(makeMockFs(true))
    expect((await sh.exec('touch /f.txt')).output).toMatch(/Permission denied/)
  })

  it('mkdir returns Permission denied', async () => {
    const sh = new AgenticShell(makeMockFs(true))
    expect((await sh.exec('mkdir /d')).output).toMatch(/Permission denied/)
  })

  it('rm returns Permission denied', async () => {
    const sh = new AgenticShell(makeMockFs(true))
    expect((await sh.exec('rm /f.txt')).output).toMatch(/Permission denied/)
  })

  it('mv returns Permission denied', async () => {
    const sh = new AgenticShell(makeMockFs(true))
    expect((await sh.exec('mv /a /b')).output).toMatch(/Permission denied/)
  })

  it('cp returns Permission denied', async () => {
    const sh = new AgenticShell(makeMockFs(true))
    expect((await sh.exec('cp /a /b')).output).toMatch(/Permission denied/)
  })
})

// DBB-006: read commands unaffected in readOnly mode
describe('DBB-006: readOnly allows read commands', () => {
  it('cat works normally', async () => {
    const sh = new AgenticShell(makeMockFs(true))
    expect((await sh.exec('cat /f.txt')).output).toBe('data')
  })

  it('ls works normally', async () => {
    const sh = new AgenticShell(makeMockFs(true))
    const out = (await sh.exec('ls /')).output
    expect(out).not.toMatch(/Permission denied/)
  })

  it('grep works normally', async () => {
    const sh = new AgenticShell(makeMockFs(true))
    const out = (await sh.exec('grep x /f.txt')).output
    expect(out).not.toMatch(/Permission denied/)
  })
})

// readOnly=false — normal operation
describe('readOnly=false allows writes', () => {
  it('touch succeeds when not readOnly', async () => {
    const mockFs = makeMockFs(false, {
      read: vi.fn().mockResolvedValue({ content: null, error: null }),
    })
    const sh = new AgenticShell(mockFs)
    await sh.exec('touch /f.txt')
    expect(mockFs.write).toHaveBeenCalledWith('/f.txt', '')
  })
})
