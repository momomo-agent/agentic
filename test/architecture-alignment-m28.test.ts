/**
 * DBB Verification Tests — m28: Architecture Alignment
 * Tests DBB-m28-arch-001 through DBB-m28-arch-004
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const ROOT = resolve(__dirname, '..')

describe('DBB-m28-arch: Architecture Alignment', () => {

  describe('DBB-m28-arch-001: Architecture gap file updated', () => {
    it('architecture.json exists', () => {
      const path = resolve(ROOT, '.team/gaps/architecture.json')
      expect(existsSync(path)).toBe(true)
    })

    it('architecture.json has timestamp after 2026-04-08', () => {
      const raw = readFileSync(resolve(ROOT, '.team/gaps/architecture.json'), 'utf-8')
      const data = JSON.parse(raw)
      const ts = new Date(data.timestamp)
      const cutoff = new Date('2026-04-08T00:00:00.000Z')
      expect(ts.getTime()).toBeGreaterThan(cutoff.getTime())
    })
  })

  describe('DBB-m28-arch-002: Architecture match > 85%', () => {
    it('match score is greater than 85', () => {
      const raw = readFileSync(resolve(ROOT, '.team/gaps/architecture.json'), 'utf-8')
      const data = JSON.parse(raw)
      expect(data.match).toBeGreaterThan(85)
    })
  })

  describe('DBB-m28-arch-003: Exit code documentation resolved', () => {
    it('no gap for exit code discrepancy or status is implemented', () => {
      const raw = readFileSync(resolve(ROOT, '.team/gaps/architecture.json'), 'utf-8')
      const data = JSON.parse(raw)
      const exitCodeGap = data.gaps.find((g: any) =>
        g.description.toLowerCase().includes('exit code') &&
        g.description.toLowerCase().includes('not currently implemented')
      )
      if (exitCodeGap) {
        expect(exitCodeGap.status).toBe('implemented')
      }
      // If no gap found, it's been removed — that's also acceptable
    })
  })

  describe('DBB-m28-arch-004: Features moved from future to implemented', () => {
    it('ARCHITECTURE.md does not list glob as future enhancement', () => {
      const arch = readFileSync(resolve(ROOT, 'ARCHITECTURE.md'), 'utf-8')
      const futureSection = arch.split('## Future Enhancements')[1] || ''
      // Should not list glob pattern support as a future enhancement
      const hasGlobFuture = /^- Glob pattern support/m.test(futureSection)
      expect(hasGlobFuture).toBe(false)
    })

    it('ARCHITECTURE.md does not list redirection as future enhancement', () => {
      const arch = readFileSync(resolve(ROOT, 'ARCHITECTURE.md'), 'utf-8')
      const futureSection = arch.split('## Future Enhancements')[1] || ''
      const hasRedirFuture = /^- Redirection/m.test(futureSection)
      expect(hasRedirFuture).toBe(false)
    })

    it('ARCHITECTURE.md does not list env variables as future enhancement', () => {
      const arch = readFileSync(resolve(ROOT, 'ARCHITECTURE.md'), 'utf-8')
      const futureSection = arch.split('## Future Enhancements')[1] || ''
      const hasEnvFuture = /^- Environment variables/m.test(futureSection)
      expect(hasEnvFuture).toBe(false)
    })

    it('ARCHITECTURE.md does not list command substitution as future enhancement', () => {
      const arch = readFileSync(resolve(ROOT, 'ARCHITECTURE.md'), 'utf-8')
      const futureSection = arch.split('## Future Enhancements')[1] || ''
      const hasCmdSubFuture = /^- Command substitution/m.test(futureSection)
      expect(hasCmdSubFuture).toBe(false)
    })

    it('ARCHITECTURE.md documents exit codes as implemented', () => {
      const arch = readFileSync(resolve(ROOT, 'ARCHITECTURE.md'), 'utf-8')
      // Should not say "not currently implemented" for exit codes
      expect(arch).not.toMatch(/Exit codes: not currently implemented/)
    })
  })
})
