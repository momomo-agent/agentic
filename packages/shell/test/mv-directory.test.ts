import { describe, it, expect, beforeEach } from 'vitest'
import { AgenticShell } from '../src/index.js'

describe('mv directory support', () => {
  let shell: AgenticShell
  let fs: any

  beforeEach(() => {
    fs = {
      read: async (path: string) => {
        if (path === '/file.txt') return { content: 'hello' }
        if (path === '/dir/file1.txt') return { content: 'content1' }
        if (path === '/dir/subdir/file2.txt') return { content: 'content2' }
        return { error: 'No such file or directory' }
      },
      write: async () => {},
      delete: async () => {},
      ls: async (path: string) => {
        if (path === '/dir') return [
          { name: 'file1.txt', type: 'file' as const },
          { name: 'subdir', type: 'dir' as const }
        ]
        if (path === '/dir/subdir') return [
          { name: 'file2.txt', type: 'file' as const }
        ]
        throw new Error('Not a directory')
      },
      mkdir: async () => {},
      grep: async () => []
    }
    shell = new AgenticShell(fs)
  })

  it('should move a file (existing behavior)', async () => {
    const result = (await shell.exec('mv /file.txt /newfile.txt')).output
    expect(result).toBe('')
  })

  it('should move a directory', async () => {
    const result = (await shell.exec('mv /dir /newdir')).output
    expect(result).toBe('')
  })

  it('should return error for missing operand', async () => {
    const result = (await shell.exec('mv /dir')).output
    expect(result).toContain('missing operand')
  })

  it('should handle non-existent source', async () => {
    fs.ls = async () => { throw new Error('Not a directory') }
    fs.read = async () => ({ error: 'No such file or directory' })
    const result = (await shell.exec('mv /nonexistent /dst')).output
    expect(result).toContain('No such file or directory')
  })
})
