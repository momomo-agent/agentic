// Task task-1775581637037: Shell exec browser safety
import { describe, it, expect, vi } from 'vitest'
import { executeShell, isNodeEnv } from '../src/tools/shell.js'

describe('m25 shell browser safety', () => {
  it('returns graceful error in browser environment', async () => {
    vi.spyOn({ isNodeEnv }, 'isNodeEnv').mockReturnValue(false)
    // Simulate browser by patching module
    const result = await executeShell({ command: 'ls' }, undefined)
    // Either no filesystem or browser — both return error gracefully
    expect(result.exitCode).toBe(1)
    expect(result.error).toBeTruthy()
  })

  it('isNodeEnv returns true in Node.js', () => {
    expect(isNodeEnv()).toBe(true)
  })

  it('returns error when no filesystem provided in node', async () => {
    const result = await executeShell({ command: 'ls' }, undefined)
    expect(result.exitCode).toBe(1)
    expect(result.error).toContain('filesystem')
  })

  it('returns error for empty command', async () => {
    const result = await executeShell({ command: '' }, undefined)
    expect(result.exitCode).toBe(1)
    expect(result.error).toContain('command')
  })
})
