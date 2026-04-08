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

describe('DBB-ls-003/004/005: ls pagination', () => {
  it('ls --page 1 --page-size 2 returns first 2 entries', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([
        { name: 'a', type: 'file' }, { name: 'b', type: 'file' },
        { name: 'c', type: 'file' }, { name: 'd', type: 'file' },
      ]),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('ls --page 1 --page-size 2')
    expect(r.output).toBe('a\nb')
  })

  it('ls --page 2 --page-size 2 returns next 2 entries', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([
        { name: 'a', type: 'file' }, { name: 'b', type: 'file' },
        { name: 'c', type: 'file' }, { name: 'd', type: 'file' },
      ]),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('ls --page 2 --page-size 2')
    expect(r.output).toBe('c\nd')
  })

  it('ls --page beyond range returns empty', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([
        { name: 'a', type: 'file' }, { name: 'b', type: 'file' },
      ]),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('ls --page 99 --page-size 2')
    expect(r.output).toBe('')
  })
})

describe('DBB-find-003/004: find -type f/d', () => {
  it('find -type f returns only files', async () => {
    const fs = makeMockFs({
      ls: vi.fn()
        .mockResolvedValueOnce([
          { name: 'file.txt', type: 'file' },
          { name: 'sub', type: 'dir' },
        ])
        .mockResolvedValue([]), // sub dir is empty
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('find /dir -type f')
    expect(r.output).toBe('/dir/file.txt')
  })

  it('find -type d returns only directories', async () => {
    const fs = makeMockFs({
      ls: vi.fn()
        .mockResolvedValueOnce([
          { name: 'file.txt', type: 'file' },
          { name: 'sub', type: 'dir' },
        ])
        .mockResolvedValue([]), // sub dir is empty
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('find /dir -type d')
    expect(r.output).toBe('/dir/sub')
  })
})

describe('DBB-rm-005: rm -r refuses root', () => {
  it('rm -r / refuses to remove root', async () => {
    const fs = makeMockFs()
    const sh = new AgenticShell(fs)
    const r = await sh.exec('rm -r /')
    expect(r.output).toContain("refusing to remove '/'")
  })
})

describe('DBB-cd-003: cd to file returns Not a directory', () => {
  it('cd to a file returns Not a directory', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([]),
      read: vi.fn().mockResolvedValue({ content: 'data', error: null }),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('cd /myfile')
    expect(r.output).toBe('cd: /myfile: Not a directory')
    expect(r.exitCode).toBe(1)
  })
})
