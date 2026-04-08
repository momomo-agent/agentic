import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const root = resolve(process.cwd())

// DBB-017: package.json has publishConfig
describe('DBB-017: publishConfig in package.json', () => {
  it('has publishConfig.access set', () => {
    const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
    expect(pkg.publishConfig).toBeDefined()
    expect(pkg.publishConfig.access).toBeTruthy()
  })
})

// DBB-018: README has npm install instructions
describe('DBB-018: README install instructions', () => {
  it('contains npm install agentic-lite', () => {
    const readme = readFileSync(resolve(root, 'README.md'), 'utf8')
    expect(readme).toMatch(/npm install agentic-lite/)
  })
})
