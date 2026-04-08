import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const arch = readFileSync(resolve('ARCHITECTURE.md'), 'utf8')

describe('ARCHITECTURE.md', () => {
  it('exists and has Overview section', () => {
    expect(arch).toContain('## Overview')
  })
  it('has Module Structure section', () => {
    expect(arch).toContain('## Module Structure')
  })
  it('has Key Interfaces section', () => {
    expect(arch).toContain('## Key Interface')
  })
  it('has Data Flow section', () => {
    expect(arch).toContain('## Data Flow')
  })
  it('has Provider Resolution section', () => {
    expect(arch).toContain('## Provider Resolution')
  })
  it('documents tool system (search/code/file/shell)', () => {
    expect(arch).toMatch(/search|code|file|shell/i)
  })
  it('documents multi-round loop', () => {
    expect(arch).toMatch(/loop|multi.round|tool_use/i)
  })
})
