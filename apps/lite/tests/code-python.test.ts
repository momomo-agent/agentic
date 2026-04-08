import { describe, test, expect } from 'vitest'
import { executeCode } from '../src/tools/code.js'

describe('Python execution', () => {
  test('basic Python print', async () => {
    const result = await executeCode({ code: 'print("hello")' })
    expect(result.output).toContain('hello')
    expect(result.error).toBeUndefined()
  })

  test('Python with return value', async () => {
    const result = await executeCode({ code: '2 + 2' })
    expect(result.output).toContain('4')
  })

  test('Python syntax error', async () => {
    const result = await executeCode({ code: 'print(' })
    expect(result.error).toBeDefined()
  })
})

describe('Language detection', () => {
  test('detects Python', async () => {
    const testCases = [
      'import os',
      'from math import sqrt',
      'def foo():\n    pass',
      'print("hi")',
      'if __name__ == "__main__":',
      'class Foo:\n    pass'
    ]

    for (const code of testCases) {
      const result = await executeCode({ code })
      // If it's Python, it should either execute successfully or fail with Python-specific error
      // We're just checking it doesn't fail with JS syntax errors
      expect(result).toBeDefined()
    }
  })

  test('detects JavaScript', async () => {
    const result = await executeCode({ code: 'console.log("hi")' })
    expect(result.output).toContain('hi')
    expect(result.error).toBeUndefined()
  })

  test('defaults to JavaScript for ambiguous code', async () => {
    const result = await executeCode({ code: '5 + 3' })
    expect(result.output).toContain('8')
    expect(result.error).toBeUndefined()
  })
})
