import { describe, it, expect } from 'vitest'
import { executeCode } from '../src/tools/code.js'

describe('DBB-009: console.log captured', () => {
  it('includes logged value in output', async () => {
    const result = await executeCode({ code: 'console.log("hello")' })
    expect(result.output).toContain('hello')
    expect(result.error).toBeUndefined()
  })
})

describe('DBB-010: async code supported', () => {
  it('executes await without error', async () => {
    const result = await executeCode({ code: 'await Promise.resolve(42)' })
    expect(result.error).toBeUndefined()
  })
})

describe('DBB-011: runtime errors captured', () => {
  it('returns error without throwing', async () => {
    const result = await executeCode({ code: 'throw new Error("oops")' })
    expect(result.error).toMatch(/oops/)
  })
})

describe('QuickJS sandbox', () => {
  it('evaluates expression and returns value', async () => {
    const result = await executeCode({ code: '1 + 1' })
    expect(result.output).toContain('→ 2')
    expect(result.error).toBeUndefined()
  })

  it('captures console output and last value', async () => {
    const result = await executeCode({ code: 'console.log("hi"); 5' })
    expect(result.output).toContain('hi')
    expect(result.output).toContain('→ 5')
  })

  it('captures thrown errors', async () => {
    const result = await executeCode({ code: 'throw new Error("boom")' })
    expect(result.error).toMatch(/boom/)
  })

  it('returns error for empty code', async () => {
    const result = await executeCode({ code: '' })
    expect(result.error).toBe('No code provided')
  })

  it('captures console.warn and console.error', async () => {
    const result = await executeCode({ code: 'console.warn("w"); console.error("e")' })
    expect(result.output).toContain('w')
    expect(result.output).toContain('e')
  })
})
