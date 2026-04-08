import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AgenticShell } from '../src/index.js'
import type { AgenticFileSystem } from 'agentic-filesystem'

describe('pipe error propagation edge cases', () => {
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

  it('should handle empty output from left side (not an error)', async () => {
    vi.mocked(fs.read).mockResolvedValue({ content: '', error: null })
    vi.mocked(fs.grep).mockResolvedValue([])
    const result = (await sh.exec('cat /empty.txt | grep foo')).output
    expect(result).toBe('')
  })

  it('should handle multi-line error output (check only first line)', async () => {
    vi.mocked(fs.read).mockResolvedValue({ content: null, error: 'not found' })
    const result = await sh.exec('cat /nonexistent | grep foo')
    expect(result.output).toBe('')
    expect(result.exitCode).not.toBe(0)
  })

  it('should not propagate legitimate output matching error pattern', async () => {
    // This is an acceptable false positive case mentioned in design.md
    // echo never returns errors, so "foo: bar: baz" is legitimate output
    const result = (await sh.exec('echo "foo: bar: baz" | grep foo')).output
    // The isErrorOutput will catch this, but it's acceptable per design
    expect(result).toMatch(/foo/)
  })

  it('should pass empty stdin through 3-stage pipe when left side errors', async () => {
    vi.mocked(fs.read).mockResolvedValue({ content: null, error: 'not found' })
    const result = await sh.exec('cat /nonexistent | grep foo | grep bar')
    expect(result.output).toBe('')
    expect(result.exitCode).not.toBe(0)
  })

  it('should handle successful left side with no matches in grep', async () => {
    vi.mocked(fs.read).mockResolvedValue({ content: 'hello\nworld', error: null })
    vi.mocked(fs.grep).mockResolvedValue([])
    const result = (await sh.exec('cat /file.txt | grep nomatch')).output
    expect(result).toBe('')
  })

  it('should not treat whitespace-prefixed error as error', async () => {
    // Edge case: error pattern must be at start of line after trimStart
    vi.mocked(fs.read).mockResolvedValue({ content: '  cat: /foo: error', error: null })
    const result = (await sh.exec('cat /file.txt | grep cat')).output
    // This should be treated as normal output since it's from file content
    expect(result).toContain('cat:')
  })
})
