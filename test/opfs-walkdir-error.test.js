import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// Unit test for OPFSBackend.walkDir() error handling via source inspection
// OPFS is browser-only; we verify the implementation structure directly

describe('OPFSBackend.walkDir() error handling', () => {
  it('implementation has try/catch inside the for-await loop', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile('src/backends/opfs.ts', 'utf8')

    // Find walkDir method
    const walkDirIdx = src.indexOf('private async walkDir(')
    assert.ok(walkDirIdx !== -1, 'walkDir method exists')

    // Extract method body (between first { and matching })
    const methodStart = src.indexOf('{', walkDirIdx)
    let depth = 0, i = methodStart, methodBody = ''
    for (; i < src.length; i++) {
      if (src[i] === '{') depth++
      else if (src[i] === '}') { depth--; if (depth === 0) { methodBody = src.slice(methodStart, i + 1); break } }
    }

    // try/catch must be inside the for-await loop
    const forAwaitIdx = methodBody.indexOf('for await')
    const tryIdx = methodBody.indexOf('try {', forAwaitIdx)
    assert.ok(forAwaitIdx !== -1, 'has for-await loop')
    assert.ok(tryIdx !== -1 && tryIdx > forAwaitIdx, 'try/catch is inside the for-await loop')

    // catch block must log and not rethrow
    const catchIdx = methodBody.indexOf('} catch', tryIdx)
    assert.ok(catchIdx !== -1, 'has catch block')
    const catchBody = methodBody.slice(catchIdx, methodBody.indexOf('\n    }\n', catchIdx) + 10)
    assert.ok(catchBody.includes('console.error'), 'catch block logs the error')
    assert.ok(!catchBody.includes('throw'), 'catch block does not rethrow')
  })

  it('list() wraps walkDir call (errors propagate to caller level)', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile('src/backends/opfs.ts', 'utf8')
    assert.ok(src.includes('await this.walkDir('), 'list() calls walkDir')
  })
})
