// Test permissions system implementation
import { AgenticFileSystem, MemoryStorage } from '../dist/index.js'

async function testReadPermissionDenied() {
  const storage = new MemoryStorage()
  await storage.set('/secret.txt', 'secret content')

  const fs = new AgenticFileSystem({
    storage,
    permissions: {
      '/secret.txt': { read: false, write: true }
    }
  })

  const result = await fs.read('/secret.txt')

  if (!result.error) {
    throw new Error('Expected error for read permission denied')
  }
  if (result.content !== undefined) {
    throw new Error('Should not return content when permission denied')
  }
  // Error message is just the path when PermissionDeniedError is thrown
  if (result.error !== '/secret.txt') {
    throw new Error(`Expected error '/secret.txt', got: ${result.error}`)
  }

  console.log('✓ testReadPermissionDenied passed')
}

async function testWritePermissionDenied() {
  const storage = new MemoryStorage()

  const fs = new AgenticFileSystem({
    storage,
    permissions: {
      '/readonly.txt': { read: true, write: false }
    }
  })

  const result = await fs.write('/readonly.txt', 'new content')

  if (!result.error) {
    throw new Error('Expected error for write permission denied')
  }
  if (result.error !== '/readonly.txt') {
    throw new Error(`Expected error '/readonly.txt', got: ${result.error}`)
  }

  console.log('✓ testWritePermissionDenied passed')
}

async function testDeletePermissionDenied() {
  const storage = new MemoryStorage()
  await storage.set('/protected.txt', 'content')

  const fs = new AgenticFileSystem({
    storage,
    permissions: {
      '/protected.txt': { read: true, write: false }
    }
  })

  const result = await fs.delete('/protected.txt')

  if (!result.error) {
    throw new Error('Expected error for delete permission denied')
  }
  if (result.error !== '/protected.txt') {
    throw new Error(`Expected error '/protected.txt', got: ${result.error}`)
  }

  // Verify file still exists
  const content = await storage.get('/protected.txt')
  if (content !== 'content') {
    throw new Error('File should not have been deleted')
  }

  console.log('✓ testDeletePermissionDenied passed')
}

async function testPrefixPermission() {
  const storage = new MemoryStorage()
  await storage.set('/docs/readme.md', 'readme')
  await storage.set('/docs/guide.md', 'guide')
  await storage.set('/src/index.ts', 'code')

  const fs = new AgenticFileSystem({
    storage,
    permissions: {
      '/docs': { read: false, write: true }
    }
  })

  // Both files under /docs should be denied
  const result1 = await fs.read('/docs/readme.md')
  if (!result1.error) {
    throw new Error('Expected error for /docs/readme.md')
  }

  const result2 = await fs.read('/docs/guide.md')
  if (!result2.error) {
    throw new Error('Expected error for /docs/guide.md')
  }

  // File outside /docs should be allowed
  const result3 = await fs.read('/src/index.ts')
  if (result3.error) {
    throw new Error(`Should allow read for /src/index.ts, got error: ${result3.error}`)
  }
  if (result3.content !== 'code') {
    throw new Error('Should return correct content')
  }

  console.log('✓ testPrefixPermission passed')
}

async function testExactPathOverridesPrefix() {
  const storage = new MemoryStorage()
  await storage.set('/docs/public.md', 'public')
  await storage.set('/docs/private.md', 'private')

  const fs = new AgenticFileSystem({
    storage,
    permissions: {
      '/docs': { read: false, write: true },
      '/docs/public.md': { read: true, write: true }
    }
  })

  // Exact match should override prefix
  const result1 = await fs.read('/docs/public.md')
  if (result1.error) {
    throw new Error(`Should allow read for /docs/public.md, got error: ${result1.error}`)
  }
  if (result1.content !== 'public') {
    throw new Error('Should return correct content')
  }

  // Other file under /docs should still be denied
  const result2 = await fs.read('/docs/private.md')
  if (!result2.error) {
    throw new Error('Expected error for /docs/private.md')
  }

  console.log('✓ testExactPathOverridesPrefix passed')
}

async function testDefaultAllowsAll() {
  const storage = new MemoryStorage()
  await storage.set('/file.txt', 'content')

  const fs = new AgenticFileSystem({ storage })

  // No permissions set, should allow all
  const readResult = await fs.read('/file.txt')
  if (readResult.error) {
    throw new Error(`Should allow read by default, got error: ${readResult.error}`)
  }

  const writeResult = await fs.write('/newfile.txt', 'new')
  if (writeResult.error) {
    throw new Error(`Should allow write by default, got error: ${writeResult.error}`)
  }

  const deleteResult = await fs.delete('/file.txt')
  if (deleteResult.error) {
    throw new Error(`Should allow delete by default, got error: ${deleteResult.error}`)
  }

  console.log('✓ testDefaultAllowsAll passed')
}

async function testReadOnlyTakesPrecedence() {
  const storage = new MemoryStorage()

  const fs = new AgenticFileSystem({
    storage,
    readOnly: true,
    permissions: {
      '/file.txt': { read: true, write: true }
    }
  })

  // Even though permission allows write, readOnly should block it
  const result = await fs.write('/file.txt', 'content')
  if (!result.error) {
    throw new Error('Expected error for readOnly filesystem')
  }
  if (result.error !== 'Read-only file system') {
    throw new Error(`Expected 'Read-only file system' error, got: ${result.error}`)
  }

  console.log('✓ testReadOnlyTakesPrecedence passed')
}

async function testSetPermissionAtRuntime() {
  const storage = new MemoryStorage()
  await storage.set('/file.txt', 'content')

  const fs = new AgenticFileSystem({ storage })

  // Initially should allow read
  const result1 = await fs.read('/file.txt')
  if (result1.error) {
    throw new Error('Should allow read initially')
  }

  // Set permission to deny read
  fs.setPermission('/file.txt', { read: false, write: true })

  // Now should deny read
  const result2 = await fs.read('/file.txt')
  if (!result2.error) {
    throw new Error('Expected error after setting permission')
  }

  console.log('✓ testSetPermissionAtRuntime passed')
}

async function testPrefixDoesNotMatchSimilarPaths() {
  const storage = new MemoryStorage()
  await storage.set('/docs/file.txt', 'docs')
  await storage.set('/documents/file.txt', 'documents')

  const fs = new AgenticFileSystem({
    storage,
    permissions: {
      '/docs': { read: false, write: true }
    }
  })

  // /docs prefix should not match /documents
  const result1 = await fs.read('/docs/file.txt')
  if (!result1.error) {
    throw new Error('Expected error for /docs/file.txt')
  }

  const result2 = await fs.read('/documents/file.txt')
  if (result2.error) {
    throw new Error(`Should allow read for /documents/file.txt, got error: ${result2.error}`)
  }

  console.log('✓ testPrefixDoesNotMatchSimilarPaths passed')
}

// Run all tests
async function runTests() {
  console.log('Running permissions system tests...\n')

  const tests = [
    testReadPermissionDenied,
    testWritePermissionDenied,
    testDeletePermissionDenied,
    testPrefixPermission,
    testExactPathOverridesPrefix,
    testDefaultAllowsAll,
    testReadOnlyTakesPrecedence,
    testSetPermissionAtRuntime,
    testPrefixDoesNotMatchSimilarPaths
  ]

  let passed = 0
  let failed = 0

  for (const test of tests) {
    try {
      await test()
      passed++
    } catch (err) {
      console.error(`✗ ${test.name} failed:`, err.message)
      failed++
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`)

  if (failed > 0) {
    process.exit(1)
  }
}

runTests()
