import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const readme = readFileSync(join(process.cwd(), 'README.md'), 'utf8')

// DBB-004: README images field must be required (no ?)
describe('DBB-004: README images required', () => {
  it('does not contain images?: string[]', () => {
    expect(readme).not.toMatch(/images\?:\s*string\[\]/)
  })

  it('contains images: string[] (required)', () => {
    expect(readme).toMatch(/images:\s*string\[\]/)
  })
})
