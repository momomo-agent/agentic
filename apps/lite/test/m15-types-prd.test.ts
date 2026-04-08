import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

const types = readFileSync('src/types.ts', 'utf8')
const prd = readFileSync('PRD.md', 'utf8')

describe('AgenticResult type correctness', () => {
  it('usage is required (no ?)', () => {
    expect(types).not.toMatch(/usage\?/)
    expect(types).toMatch(/usage:\s*\{/)
  })
  it('images is string[] without undefined union', () => {
    expect(types).toMatch(/images:\s*string\[\]/)
    expect(types).not.toMatch(/images\?/)
  })
})

describe('PRD AgenticResult schema', () => {
  it('includes shellResults field', () => {
    expect(prd).toContain('shellResults')
  })
})
