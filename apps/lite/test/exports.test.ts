import { test, expect } from 'vitest'
import { readFileSync } from 'node:fs'

test('DBB-001: ShellResult exported from src/index.ts', () => {
  const indexSource = readFileSync('src/index.ts', 'utf-8')

  // Verify ShellResult is in the type export line
  expect(indexSource).toContain('ShellResult')

  // Verify it's in the type export statement
  const typeExportMatch = indexSource.match(/export type \{[^}]+\}/)
  expect(typeExportMatch).toBeTruthy()
  expect(typeExportMatch![0]).toContain('ShellResult')
})

test('DBB-002: shellToolDef and executeShell exported from src/tools/index.ts', () => {
  const toolsIndexSource = readFileSync('src/tools/index.ts', 'utf-8')

  // Verify both exports are present
  expect(toolsIndexSource).toContain('shellToolDef')
  expect(toolsIndexSource).toContain('executeShell')

  // Verify they're exported from shell.js
  expect(toolsIndexSource).toContain("from './shell.js'")
})

test('Verify ShellResult type exists in types.ts', () => {
  const typesSource = readFileSync('src/types.ts', 'utf-8')

  // Verify ShellResult interface/type is defined
  expect(typesSource).toContain('ShellResult')
})
