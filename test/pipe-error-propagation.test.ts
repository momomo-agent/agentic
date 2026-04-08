import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AgenticShell } from '../src/index.js'
import type { AgenticFileSystem } from 'agentic-filesystem'

describe('pipe error propagation', () => {
  let fs: AgenticFileSystem
  let sh: AgenticShell

  beforeEach(() => {
    fs = {
      read: vi.fn(),
      write: vi.fn(),
      ls: vi.fn(),
      delete: vi.fn(),
      grep: vi.fn(),
    } as any
    sh = new AgenticShell(fs)
  })

  it('should pass empty stdin to right command when left side errors', async () => {
    vi.mocked(fs.read).mockResolvedValue({ content: null, error: 'not found' })
    const result = await sh.exec('cat /nonexistent | grep foo')
    expect(result.output).toBe('')
    expect(result.exitCode).not.toBe(0)
  })

  it('should not propagate when left side succeeds', async () => {
    vi.mocked(fs.read).mockResolvedValue({ content: 'hello\nworld', error: null })
    const result = (await sh.exec('cat /file.txt | grep hello')).output
    expect(result).toContain('hello')
  })

  it('should pass empty stdin through multi-segment pipe when left side errors', async () => {
    vi.mocked(fs.read).mockResolvedValue({ content: null, error: 'not found' })
    const result = await sh.exec('cat /nonexistent | grep foo | wc -l')
    expect(result.output).toBe('0')
    expect(result.exitCode).not.toBe(0)
  })
})
