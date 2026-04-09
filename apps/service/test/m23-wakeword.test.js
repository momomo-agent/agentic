// Test: 服务端常驻唤醒词检测
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'

const src = readFileSync(resolve('src/server/hub.js'), 'utf8')

describe('服务端常驻唤醒词检测', () => {
  it('exports startWakeWordDetection', () => expect(src).toContain('export function startWakeWordDetection'))
  it('default keyword hey agent', () => expect(src).toContain("'hey agent'"))
  it('WAKE_WORD env override', () => expect(src).toContain('process.env.WAKE_WORD'))
  it('non-TTY guard', () => expect(src).toContain('isTTY'))
  it('case-insensitive match', () => expect(src).toContain('toLowerCase'))
  it('broadcasts wake type', () => expect(src).toMatch(/type:\s*['"]wake['"]|type:\s*['"]wakeword['"]|wakeword/))
})
