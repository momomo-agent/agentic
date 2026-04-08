import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const root = join(import.meta.dirname, '..')

describe('M64 DBB: agentic-embed package verification', () => {
  it('package.json has agentic-embed dependency', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies }
    expect(allDeps).toHaveProperty('agentic-embed')
  })

  it('src/runtime/embed.js imports from agentic-embed', () => {
    const src = readFileSync(join(root, 'src/runtime/embed.js'), 'utf8')
    expect(src).toMatch(/from ['"]agentic-embed['"]/)
  })
})
