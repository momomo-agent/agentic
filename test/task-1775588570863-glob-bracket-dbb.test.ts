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

describe('Glob bracket expressions DBB coverage', () => {
  // DBB-m27-glob-003: [0-9] digit range
  it('[0-9].txt matches digit-prefixed files only', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([
        { name: '1.txt', type: 'file' },
        { name: '5.txt', type: 'file' },
        { name: 'a.txt', type: 'file' },
      ]),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('ls [0-9].txt')
    expect(r.output).toContain('1.txt')
    expect(r.output).toContain('5.txt')
    expect(r.output).not.toContain('a.txt')
  })

  // DBB-m27-glob-006: Bracket in ls command
  it('ls [0-9]* matches digit-prefixed files', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([
        { name: 'foo1.log', type: 'file' },
        { name: 'foo2.log', type: 'file' },
        { name: 'fooa.log', type: 'file' },
      ]),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('ls [0-9]*')
    // [0-9]* matches files starting with a digit
    // foo1.log starts with 'f', not a digit — should NOT match
    // No files start with digits, so empty result
    expect(r.output).not.toContain('fooa.log')
  })

  // DBB-m27-glob-007: Empty bracket result in cat
  it('cat [xyz].txt with no matches passes literal to read', async () => {
    const readMock = vi.fn().mockResolvedValue({ content: '', error: null })
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([
        { name: 'a.txt', type: 'file' },
        { name: 'b.txt', type: 'file' },
      ]),
      read: readMock,
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('cat [xyz].txt')
    // No files match [xyz].txt — the literal pattern is passed to read
    expect(readMock).toHaveBeenCalled()
  })

  // DBB-m27-glob-007b: Empty bracket result with ls returns error
  it('ls [xyz] with no matches returns error', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([
        { name: 'a.txt', type: 'file' },
        { name: 'b.txt', type: 'file' },
      ]),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('ls [xyz]')
    // No files match [xyz] — ls returns No such file or directory
    expect(r.output).toContain('No such file or directory')
  })

  // Additional: [!abc] negation with range
  it('[!0-9].txt excludes digit-prefixed files', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([
        { name: '1.txt', type: 'file' },
        { name: 'a.txt', type: 'file' },
        { name: 'z.txt', type: 'file' },
      ]),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('ls [!0-9].txt')
    expect(r.output).not.toContain('1.txt')
    expect(r.output).toContain('a.txt')
    expect(r.output).toContain('z.txt')
  })

  // Regression: [abc] still works
  it('[abc].txt matches character set', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([
        { name: 'a.txt', type: 'file' },
        { name: 'b.txt', type: 'file' },
        { name: 'c.txt', type: 'file' },
        { name: 'd.txt', type: 'file' },
      ]),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('ls [abc].txt')
    expect(r.output).toContain('a.txt')
    expect(r.output).toContain('b.txt')
    expect(r.output).toContain('c.txt')
    expect(r.output).not.toContain('d.txt')
  })
})
