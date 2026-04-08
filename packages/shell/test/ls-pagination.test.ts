import { describe, it, expect, beforeEach } from 'vitest'
import { AgenticShell } from '../src/index.js'
import type { AgenticFileSystem } from '../src/filesystem.js'

describe('ls pagination', () => {
  let shell: AgenticShell
  let mockFs: AgenticFileSystem

  beforeEach(() => {
    mockFs = {
      ls: async (path: string) => {
        if (path === '/bigdir') {
          return [
            { name: 'file1.txt', type: 'file' },
            { name: 'file2.txt', type: 'file' },
            { name: 'file3.txt', type: 'file' },
            { name: 'file4.txt', type: 'file' },
            { name: 'file5.txt', type: 'file' },
            { name: 'file6.txt', type: 'file' },
            { name: 'file7.txt', type: 'file' },
          ]
        }
        return []
      },
      read: async () => ({ content: '' }),
      write: async () => {},
      delete: async () => {},
      grep: async () => [],
      mkdir: async () => {},
    }
    shell = new AgenticShell(mockFs)
  })

  it('ls --page 1 --page-size 3 returns first 3 entries', async () => {
    const out = (await shell.exec('ls --page 1 --page-size 3 /bigdir')).output
    const lines = out.split('\n').filter(l => l)
    expect(lines).toHaveLength(3)
    expect(lines[0]).toBe('file1.txt')
    expect(lines[1]).toBe('file2.txt')
    expect(lines[2]).toBe('file3.txt')
  })

  it('ls --page 2 --page-size 3 returns entries 4-6', async () => {
    const out = (await shell.exec('ls --page 2 --page-size 3 /bigdir')).output
    const lines = out.split('\n').filter(l => l)
    expect(lines).toHaveLength(3)
    expect(lines[0]).toBe('file4.txt')
    expect(lines[1]).toBe('file5.txt')
    expect(lines[2]).toBe('file6.txt')
  })

  it('ls --page 3 --page-size 3 returns last entry', async () => {
    const out = (await shell.exec('ls --page 3 --page-size 3 /bigdir')).output
    const lines = out.split('\n').filter(l => l)
    expect(lines).toHaveLength(1)
    expect(lines[0]).toBe('file7.txt')
  })

  it('ls --page 99 returns empty string when beyond last page', async () => {
    const out = (await shell.exec('ls --page 99 --page-size 3 /bigdir')).output
    expect(out).toBe('')
  })

  it('ls without pagination returns all entries', async () => {
    const out = (await shell.exec('ls /bigdir')).output
    const lines = out.split('\n').filter(l => l)
    expect(lines).toHaveLength(7)
  })

  it('ls --page 0 treats as page 1', async () => {
    const out = (await shell.exec('ls --page 0 --page-size 3 /bigdir')).output
    const lines = out.split('\n').filter(l => l)
    expect(lines).toHaveLength(3)
    expect(lines[0]).toBe('file1.txt')
  })

  it('ls --page -1 treats as page 1', async () => {
    const out = (await shell.exec('ls --page -1 --page-size 3 /bigdir')).output
    const lines = out.split('\n').filter(l => l)
    expect(lines).toHaveLength(3)
    expect(lines[0]).toBe('file1.txt')
  })

  it('ls --page without --page-size defaults to 20', async () => {
    const out = (await shell.exec('ls --page 1 /bigdir')).output
    const lines = out.split('\n').filter(l => l)
    expect(lines).toHaveLength(7) // all 7 fit in default page size of 20
  })

  it('ls --page works with -l flag', async () => {
    const out = (await shell.exec('ls -l --page 1 --page-size 2 /bigdir')).output
    const lines = out.split('\n').filter(l => l)
    expect(lines).toHaveLength(2)
    expect(lines[0]).toMatch(/file1.txt/)
    expect(lines[1]).toMatch(/file2.txt/)
  })

  it('ls -a --page 1 --page-size 3 includes dotfiles in pagination', async () => {
    const mockFsHidden = {
      ls: async (path: string) => {
        if (path === '/dir') {
          return [
            { name: '.hidden', type: 'file' },
            { name: 'visible1.txt', type: 'file' },
            { name: 'visible2.txt', type: 'file' },
            { name: 'visible3.txt', type: 'file' },
          ]
        }
        return []
      },
      read: async () => ({ content: '' }),
      write: async () => {},
      delete: async () => {},
      grep: async () => [],
      mkdir: async () => {},
    }
    const sh = new AgenticShell(mockFsHidden)
    const out = (await sh.exec('ls -a --page 1 --page-size 3 /dir')).output
    const lines = out.split('\n').filter(l => l)
    expect(lines).toHaveLength(3)
    expect(lines[0]).toBe('./')
  })

  it('ls --page 1 --page-size 0 defaults to page-size 20', async () => {
    const out = (await shell.exec('ls --page 1 --page-size 0 /bigdir')).output
    const lines = out.split('\n').filter(l => l)
    expect(lines).toHaveLength(7) // all 7 fit in default page size of 20
  })

  it('ls --page 1 --page-size -5 defaults to page-size 20', async () => {
    const out = (await shell.exec('ls --page 1 --page-size -5 /bigdir')).output
    const lines = out.split('\n').filter(l => l)
    expect(lines).toHaveLength(7)
  })

  it('ls --page 1 --page-size 7 returns all 7 entries exactly', async () => {
    const out = (await shell.exec('ls --page 1 --page-size 7 /bigdir')).output
    const lines = out.split('\n').filter(l => l)
    expect(lines).toHaveLength(7)
    expect(lines[0]).toBe('file1.txt')
    expect(lines[6]).toBe('file7.txt')
  })

  it('ls -l --page 5 --page-size 3 returns empty for 7-entry dir', async () => {
    const out = (await shell.exec('ls -l --page 5 --page-size 3 /bigdir')).output
    expect(out).toBe('')
  })
})
