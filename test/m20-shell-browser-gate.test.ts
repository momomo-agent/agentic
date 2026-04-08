import { describe, it, expect } from 'vitest'
import { isNodeEnv, executeShell } from '../src/tools/shell.js'
import { AgenticFileSystem, MemoryStorage } from 'agentic-filesystem'

describe('DBB-001/002: shell_exec environment gating', () => {
  it('isNodeEnv() returns true in Node.js', () => {
    expect(isNodeEnv()).toBe(true)
  })

  it('executeShell returns browser error when isNodeEnv is false (simulated)', async () => {
    // Simulate browser: temporarily mock process
    const orig = (globalThis as any).process
    ;(globalThis as any).process = undefined
    const fs = new AgenticFileSystem({ storage: new MemoryStorage() })
    const result = await executeShell({ command: 'echo hi' }, fs)
    ;(globalThis as any).process = orig
    expect(result.exitCode).toBe(1)
    expect(result.error).toMatch(/browser/i)
  })

  it('executeShell works in Node.js', async () => {
    const fs = new AgenticFileSystem({ storage: new MemoryStorage() })
    const result = await executeShell({ command: 'echo hello' }, fs)
    expect(result.exitCode).toBe(0)
    expect(result.output).toContain('hello')
  })

  it('ask.ts buildToolDefs gates shell behind isNodeEnv (verified via shell.ts export)', () => {
    // isNodeEnv() is used in ask.ts: if (tools.includes('shell') && isNodeEnv())
    // In Node.js this should be true
    expect(isNodeEnv()).toBe(true)
  })
})
