import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const root = join(import.meta.dirname, '..')
const arch = readFileSync(join(root, 'ARCHITECTURE.md'), 'utf8')

// Collect all .js files under src/, excluding node_modules and ui/
function collectSrcFiles(dir, base = dir) {
  const entries = readdirSync(dir)
  const files = []
  for (const entry of entries) {
    if (entry === 'node_modules' || entry === 'ui') continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      files.push(...collectSrcFiles(full, base))
    } else if (entry.endsWith('.js')) {
      files.push(full.slice(base.length + 1)) // relative to src/
    }
  }
  return files
}

describe('M98 DBB-011: No stale CR content in ARCHITECTURE.md', () => {
  it('should NOT contain "Add sections to ARCHITECTURE.md"', () => {
    expect(arch).not.toContain('Add sections to ARCHITECTURE.md')
  })

  it('should NOT contain "change-request" text', () => {
    expect(arch.toLowerCase()).not.toContain('change-request')
  })

  it('should NOT contain "CR-" block references', () => {
    expect(arch).not.toMatch(/\bCR-\d+/)
  })
})

describe('M98 DBB-012: Port references show 1234, not 3000', () => {
  it('should NOT reference port 3000', () => {
    // Allow no mention of 3000 at all (historical context aside, none expected)
    expect(arch).not.toMatch(/:3000\b/)
  })

  it('install/run section should reference port 1234', () => {
    expect(arch).toMatch(/1234/)
  })
})

describe('M98 DBB-012: Directory tree includes all src/ files', () => {
  const srcDir = join(root, 'src')
  const srcFiles = collectSrcFiles(srcDir)

  for (const file of srcFiles) {
    const basename = file.split('/').pop()
    it(`src/${file} (${basename}) should be mentioned in ARCHITECTURE.md`, () => {
      expect(arch).toContain(basename)
    })
  }
})

describe('M98 DBB-012: Previously missing key files are now present', () => {
  const keyFiles = [
    'embed.js',
    'vad.js',
    'profiler.js',
    'latency-log.js',
    'store/index.js',
    'sox.js',
    'download-state.js',
    'tunnel.js',
    'cert.js',
    'httpsServer.js',
    'middleware.js',
  ]

  for (const file of keyFiles) {
    const basename = file.split('/').pop()
    it(`${file} should be mentioned in ARCHITECTURE.md`, () => {
      expect(arch).toContain(basename)
    })
  }
})
