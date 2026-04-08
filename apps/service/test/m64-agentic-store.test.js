import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const root = join(import.meta.dirname, '..')

describe('M64 DBB: agentic-store package verification', () => {
  it('package.json has agentic-store dependency', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies }
    expect(allDeps).toHaveProperty('agentic-store')
  })

  it('src/store/index.js imports from agentic-store', () => {
    const src = readFileSync(join(root, 'src/store/index.js'), 'utf8')
    expect(src).toMatch(/from ['"]agentic-store['"]/)
  })
})
