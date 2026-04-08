import { describe, it, expect } from 'vitest'
import { AgenticShell } from '../src/index.js'

const files10 = Array.from({ length: 10 }, (_, i) => ({ name: `file${i + 1}.txt`, type: 'file' as const }))

function makePageFs() {
  return {
    ls: async () => files10,
    read: async () => ({ content: '', error: null }),
    write: async () => {},
    delete: async () => {},
    grep: async () => [],
    mkdir: async () => {},
  }
}

describe('pagination', () => {
  it('returns first page', async () => {
    const sh = new AgenticShell(makePageFs() as any)
    const lines = (await sh.exec('ls / --page 1 --page-size 5')).output.split('\n').filter(Boolean)
    expect(lines).toHaveLength(5)
    expect(lines[0]).toBe('file1.txt')
    expect(lines[4]).toBe('file5.txt')
  })

  it('returns second page', async () => {
    const sh = new AgenticShell(makePageFs() as any)
    const lines = (await sh.exec('ls / --page 2 --page-size 5')).output.split('\n').filter(Boolean)
    expect(lines).toHaveLength(5)
    expect(lines[0]).toBe('file6.txt')
    expect(lines[4]).toBe('file10.txt')
  })

  it('returns empty for out-of-bounds page', async () => {
    const sh = new AgenticShell(makePageFs() as any)
    expect((await sh.exec('ls / --page 999 --page-size 5')).output).toBe('')
  })

  it('returns all entries when no page flag', async () => {
    const sh = new AgenticShell(makePageFs() as any)
    const lines = (await sh.exec('ls /')).output.split('\n').filter(Boolean)
    expect(lines).toHaveLength(10)
  })
})

describe('streaming grep', () => {
  function makeStreamFs(lines: string[]) {
    return {
      ls: async () => [],
      read: async () => ({ content: '', error: null }),
      write: async () => {},
      delete: async () => {},
      grep: async () => [],
      mkdir: async () => {},
      readStream: async function* (_path: string) {
        for (const line of lines) yield line
      },
    }
  }

  it('matches lines via readStream', async () => {
    const sh = new AgenticShell(makeStreamFs(['hello world', 'no match', 'hello again']) as any)
    const out = (await sh.exec('grep hello /file.txt')).output
    expect(out).toMatch(/hello world/)
    expect(out).toMatch(/hello again/)
    expect(out).not.toMatch(/no match/)
  })

  it('returns empty for no matches via stream', async () => {
    const sh = new AgenticShell(makeStreamFs(['no match here', 'nothing']) as any)
    expect((await sh.exec('grep hello /file.txt')).output).toBe('')
  })

  it('falls back to read() when readStream unavailable', async () => {
    const fs = {
      ls: async () => [],
      read: async () => ({ content: 'hello world\nno match', error: null }),
      write: async () => {},
      delete: async () => {},
      grep: async () => [],
      mkdir: async () => {},
    }
    const sh = new AgenticShell(fs as any)
    const out = (await sh.exec('grep hello /file.txt')).output
    expect(out).toMatch(/grep: warning: streaming unavailable/)
    expect(out).toMatch(/hello world/)
  })
})
