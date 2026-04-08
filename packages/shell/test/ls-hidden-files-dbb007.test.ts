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

describe('DBB-007: ls -a real hidden files', () => {
  it('ls -a includes real dotfiles from fs (e.g. .gitignore)', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([
        { name: '.gitignore', type: 'file' },
        { name: '.env', type: 'file' },
        { name: 'README.md', type: 'file' },
      ]),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('ls -a /dir')).output
    expect(out).toContain('.gitignore')
    expect(out).toContain('.env')
    expect(out).toContain('README.md')
  })

  it('ls without -a filters out real dotfiles from fs', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([
        { name: '.gitignore', type: 'file' },
        { name: '.env', type: 'file' },
        { name: 'README.md', type: 'file' },
      ]),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('ls /dir')).output
    expect(out).not.toContain('.gitignore')
    expect(out).not.toContain('.env')
    expect(out).toContain('README.md')
  })

  it('ls -a still includes synthetic . and .. when fs does not return them', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([
        { name: '.hidden', type: 'file' },
      ]),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('ls -a /dir')).output
    expect(out).toContain('./')
    expect(out).toContain('../')
    expect(out).toContain('.hidden')
  })

  it('ls -a does not duplicate . and .. if fs already returns them', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([
        { name: '.', type: 'dir' },
        { name: '..', type: 'dir' },
        { name: '.hidden', type: 'file' },
      ]),
    })
    const sh = new AgenticShell(fs)
    const out = (await sh.exec('ls -a /dir')).output
    const lines = out.split('\n')
    const dotCount = lines.filter(l => l === './').length
    const dotDotCount = lines.filter(l => l === '../').length
    expect(dotCount).toBe(1)
    expect(dotDotCount).toBe(1)
  })
})
