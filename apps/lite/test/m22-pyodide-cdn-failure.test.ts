import { describe, it, expect, vi, beforeEach } from 'vitest'

// We test executePythonBrowser indirectly via executeCode by simulating browser env
// and mocking the pyodide dynamic import

describe('m22: Pyodide CDN load failure graceful handling', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('resolves with error when pyodide import fails', async () => {
    vi.doMock('pyodide', () => { throw new Error('CDN blocked') })

    // Simulate browser env
    const origWindow = (globalThis as any).window
    const origDocument = (globalThis as any).document
    ;(globalThis as any).window = {}
    ;(globalThis as any).document = {}

    const { executeCode } = await import('../src/tools/code.js')
    const result = await executeCode({ code: 'print("hi")' })

    ;(globalThis as any).window = origWindow
    ;(globalThis as any).document = origDocument

    expect(result.output).toBe('')
    expect(result.error).toMatch(/Pyodide unavailable/)
  })
})
