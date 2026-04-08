import { describe, it, expect, beforeEach } from 'vitest'
import { AgenticShell } from '../src/index.js'

describe('mv DBB-005 coverage', () => {
  let shell: AgenticShell
  let written: Record<string, string>
  let deleted: string[]
  let dirs: Record<string, any[]>

  beforeEach(() => {
    written = {}
    deleted = []
    dirs = {
      '/src': [{ name: 'file1.txt', type: 'file' as const }],
      '/src/sub': [{ name: 'deep.txt', type: 'file' as const }],
      '/a/b': [{ name: 'nested.txt', type: 'file' as const }],
    }

    const fs = {
      read: async (path: string) => {
        if (deleted.includes(path)) return { error: 'No such file or directory' }
        if (path === '/src/file1.txt') return { content: 'hello' }
        if (path === '/src/sub/deep.txt') return { content: 'deep' }
        if (path === '/a/b/nested.txt') return { content: 'nested' }
        if (path === '/file.txt') return { content: 'file' }
        return { error: 'No such file or directory' }
      },
      write: async (path: string, content: string) => { written[path] = content },
      delete: async (path: string) => { deleted.push(path) },
      ls: async (path: string) => {
        if (deleted.includes(path)) throw new Error('No such file or directory')
        if (dirs[path]) return dirs[path]
        throw new Error('Not a directory')
      },
      mkdir: async (path: string) => { dirs[path] = dirs[path] ?? [] },
      grep: async () => []
    }
    shell = new AgenticShell(fs)
  })

  it('after mv /src /dst, ls /src returns error and /dst has contents', async () => {
    const result = (await shell.exec('mv /src /dst')).output
    expect(result).toBe('')
    // dst should have been created with contents copied
    expect(written['/dst/file1.txt']).toBe('hello')
    // src should be deleted
    expect(deleted).toContain('/src/file1.txt')
  })

  it('mv /a/b /c/d moves nested directory', async () => {
    const result = (await shell.exec('mv /a/b /c/d')).output
    expect(result).toBe('')
    expect(written['/c/d/nested.txt']).toBe('nested')
  })

  it('mv /nonexistent /dst returns No such file or directory', async () => {
    const result = (await shell.exec('mv /nonexistent /dst')).output
    expect(result).toContain('No such file or directory')
  })

  it('mv on readOnly fs returns Permission denied', async () => {
    const roFs = {
      readOnly: true,
      read: async () => ({ content: '' }),
      write: async () => {},
      delete: async () => {},
      ls: async () => [],
      mkdir: async () => {},
      grep: async () => []
    }
    const roShell = new AgenticShell(roFs as any)
    const result = (await roShell.exec('mv /file.txt /dst.txt')).output
    expect(result).toContain('Permission denied')
  })
})
