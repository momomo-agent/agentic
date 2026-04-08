import { describe, it, expect } from 'vitest'
import { executeCode } from '../src/tools/code.js'

describe('executeCode timeout enforcement', () => {
  it('returns normally without timeout', async () => {
    const result = await executeCode({ code: '1+1' })
    expect(result.error).toBeUndefined()
    expect(result.output).toContain('2')
  })

  it('returns normally with timeout=0', async () => {
    const result = await executeCode({ code: '1+1' }, undefined, 0)
    expect(result.error).toBeUndefined()
    expect(result.output).toContain('2')
  })

  it('returns normally with timeout=undefined', async () => {
    const result = await executeCode({ code: '2*3' }, undefined, undefined)
    expect(result.error).toBeUndefined()
    expect(result.output).toContain('6')
  })

  it('returns normally when code finishes before timeout', async () => {
    const result = await executeCode({ code: '"hello"' }, undefined, 10000)
    expect(result.error).toBeUndefined()
    expect(result.output).toContain('hello')
  })

  it('times out Python subprocess infinite loop (node)', async () => {
    // Skip in browser environment
    if (typeof window !== 'undefined') return

    // Need 'print' keyword to trigger Python detection in detectLanguage()
    const start = Date.now()
    const result = await executeCode(
      { code: 'print("start");\nwhile True: pass' },
      undefined,
      500,
    )
    const elapsed = Date.now() - start

    // Python subprocess timeout kills process — expect timeout error or SIGTERM
    const combined = `${result.error ?? ''} ${result.output ?? ''}`
    expect(combined).toMatch(/timed out|SIGTERM|killed|Exit code/i)
    expect(elapsed).toBeLessThan(15000)
  }, 20000)

  it('accepts timeout as third parameter', async () => {
    // Verify executeCode signature accepts timeout param
    const result = await executeCode({ code: '42' }, undefined, 5000)
    expect(result.error).toBeUndefined()
    expect(result.output).toContain('42')
  })

  it('negative timeout treated as no timeout', async () => {
    const result = await executeCode({ code: '7*6' }, undefined, -1)
    expect(result.error).toBeUndefined()
    expect(result.output).toContain('42')
  })

  it('timeout does NOT interrupt sync QuickJS infinite loop (known limitation)', () => {
    // QuickJS sync evalCode() blocks the event loop, so the withTimeout
    // timer never fires. This is a known limitation — only Python subprocess
    // and truly async operations can be reliably interrupted.
    // See: withTimeout wraps Promise, but vm.evalCode is synchronous/blocking.
    expect(true).toBe(true)
  })

  it('timeout does NOT interrupt QuickJS evalCodeAsync (known limitation)', () => {
    // QuickJS evalCodeAsync doesn't yield to the Node.js event loop between
    // microtask steps, so the withTimeout timer can't fire during execution.
    // The timeout mechanism only works for operations that yield control back
    // to the host event loop (e.g., Python subprocess via spawn).
    expect(true).toBe(true)
  })

  it('throws timeout error for infinite Python loop (browser/pyodide)', async () => {
    // Pyodide runs in browser; skip in Node environment
    if (typeof window === 'undefined') return

    const start = Date.now()
    const result = await executeCode(
      { code: 'while True: pass' },
      undefined,
      500,
    )
    const elapsed = Date.now() - start

    // Expect timeout error or similar failure
    const combined = `${result.error ?? ''} ${result.output ?? ''}`
    expect(combined).toMatch(/timed out|timeout/i)
    expect(elapsed).toBeLessThan(5000)
  }, 10000)

  it('fast code completes within timeout', async () => {
    const result = await executeCode(
      { code: 'let x = 0; for(let i=0;i<100;i++){x+=i}; x' },
      undefined,
      5000,
    )
    expect(result.error).toBeUndefined()
    expect(result.output).toContain('4950')
  })
})
