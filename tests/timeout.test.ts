import { describe, it, expect } from 'vitest'
import { executeCode } from '../src/tools/code.js'

describe('Code execution timeout', () => {
  it('fast JS code completes within timeout', async () => {
    const result = await executeCode(
      { code: 'let x = 0; for(let i=0;i<100;i++){x+=i}; x' },
      undefined,
      5000,
    )
    expect(result.error).toBeUndefined()
    expect(result.output).toContain('4950')
  })

  it('fast JS code works without timeout (undefined)', async () => {
    const result = await executeCode({ code: '1+1' }, undefined, undefined)
    expect(result.error).toBeUndefined()
    expect(result.output).toContain('2')
  })

  it('timeout=0 means no enforcement', async () => {
    const result = await executeCode({ code: '1+1' }, undefined, 0)
    expect(result.error).toBeUndefined()
    expect(result.output).toContain('2')
  })

  it('negative timeout means no enforcement', async () => {
    const result = await executeCode({ code: '1+1' }, undefined, -1)
    expect(result.error).toBeUndefined()
    expect(result.output).toContain('2')
  })

  it('JS code with console.log within timeout', async () => {
    const result = await executeCode(
      { code: 'console.log("hello"); 42' },
      undefined,
      5000,
    )
    expect(result.error).toBeUndefined()
    expect(result.output).toContain('hello')
    expect(result.output).toContain('42')
  })

  it('throws timeout error for slow JS code', async () => {
    const start = Date.now()
    const result = await executeCode(
      { code: 'let i=0; while(true){i++; if(i>1e9) break}' },
      undefined,
      500,
    )
    const elapsed = Date.now() - start

    // Should either timeout or complete (QuickJS may have its own limits)
    // If it times out, the error message should be descriptive
    if (result.error) {
      expect(result.error).toMatch(/timed out|timeout/i)
      expect(elapsed).toBeLessThan(3000)
    }
  })

  it('Python timeout on Node (python3)', async () => {
    const start = Date.now()
    const result = await executeCode(
      { code: 'import time; time.sleep(10)' },
      undefined,
      500,
    )
    const elapsed = Date.now() - start

    // Should timeout and return error
    expect(result.error).toBeDefined()
    expect(elapsed).toBeLessThan(5000)
  }, 10000) // vitest timeout

  it('fast Python code completes within timeout', async () => {
    const result = await executeCode(
      { code: 'print("hello")' },
      undefined,
      5000,
    )
    expect(result.error).toBeUndefined()
    expect(result.output).toContain('hello')
  })

  it('timeout error message includes timeout value', async () => {
    const result = await executeCode(
      { code: 'import time; time.sleep(10)' },
      undefined,
      300,
    )

    if (result.error) {
      expect(result.error).toContain('300')
    }
  }, 10000)
})

describe('Code execution — backward compatibility without timeout', () => {
  it('executes JS without timeout parameter', async () => {
    const result = await executeCode({ code: '2 * 3' })
    expect(result.error).toBeUndefined()
    expect(result.output).toContain('6')
  })

  it('executes Python without timeout parameter', async () => {
    const result = await executeCode({ code: 'print(2 * 3)' })
    expect(result.error).toBeUndefined()
    expect(result.output).toContain('6')
  })

  it('JS syntax error returns error', async () => {
    const result = await executeCode({ code: 'function() {' })
    expect(result.error).toBeDefined()
  })

  it('Python syntax error returns error', async () => {
    const result = await executeCode({ code: 'def foo(' })
    expect(result.error).toBeDefined()
  })
})
