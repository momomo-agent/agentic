// Test tree() API implementation
import { AgenticFileSystem, MemoryStorage } from '../dist/index.js'

async function testTreeFlatStructure() {
  const storage = new MemoryStorage()
  const fs = new AgenticFileSystem({ storage })

  // Create flat structure
  await storage.set('/file1.txt', 'content1')
  await storage.set('/file2.txt', 'content2')
  await storage.set('/file3.txt', 'content3')

  const tree = await fs.tree()

  // Should return array of file nodes
  if (!Array.isArray(tree)) {
    throw new Error('tree() should return an array')
  }

  if (tree.length !== 3) {
    throw new Error(`Expected 3 nodes, got ${tree.length}`)
  }

  // All should be file nodes
  for (const node of tree) {
    if (node.type !== 'file') {
      throw new Error(`Expected type 'file', got '${node.type}'`)
    }
    if (node.children !== undefined) {
      throw new Error('File nodes should not have children property')
    }
    if (!node.path.startsWith('/')) {
      throw new Error(`Path should start with /, got ${node.path}`)
    }
  }

  console.log('✓ testTreeFlatStructure passed')
}

async function testTreeNestedStructure() {
  const storage = new MemoryStorage()
  const fs = new AgenticFileSystem({ storage })

  // Create nested structure
  await storage.set('/docs/readme.md', 'readme')
  await storage.set('/docs/guide.md', 'guide')
  await storage.set('/src/index.ts', 'code')
  await storage.set('/src/lib/utils.ts', 'utils')
  await storage.set('/root.txt', 'root')

  const tree = await fs.tree()

  if (!Array.isArray(tree)) {
    throw new Error('tree() should return an array')
  }

  // Should have 3 top-level nodes: /docs, /src, /root.txt
  if (tree.length !== 3) {
    throw new Error(`Expected 3 top-level nodes, got ${tree.length}`)
  }

  // Find the docs dir node
  const docsNode = tree.find(n => n.path === '/docs')
  if (!docsNode) {
    throw new Error('Should have /docs node')
  }
  if (docsNode.type !== 'dir') {
    throw new Error(`/docs should be type 'dir', got '${docsNode.type}'`)
  }
  if (!Array.isArray(docsNode.children)) {
    throw new Error('/docs should have children array')
  }
  if (docsNode.children.length !== 2) {
    throw new Error(`/docs should have 2 children, got ${docsNode.children.length}`)
  }

  // Find the src dir node
  const srcNode = tree.find(n => n.path === '/src')
  if (!srcNode) {
    throw new Error('Should have /src node')
  }
  if (srcNode.type !== 'dir') {
    throw new Error(`/src should be type 'dir', got '${srcNode.type}'`)
  }
  if (!Array.isArray(srcNode.children)) {
    throw new Error('/src should have children array')
  }

  // /src should have /src/index.ts and /src/lib
  const srcIndexNode = srcNode.children.find(n => n.path === '/src/index.ts')
  const srcLibNode = srcNode.children.find(n => n.path === '/src/lib')

  if (!srcIndexNode) {
    throw new Error('/src should contain /src/index.ts')
  }
  if (srcIndexNode.type !== 'file') {
    throw new Error('/src/index.ts should be a file')
  }

  if (!srcLibNode) {
    throw new Error('/src should contain /src/lib dir')
  }
  if (srcLibNode.type !== 'dir') {
    throw new Error('/src/lib should be a dir')
  }
  if (!Array.isArray(srcLibNode.children)) {
    throw new Error('/src/lib should have children array')
  }
  if (srcLibNode.children.length !== 1) {
    throw new Error(`/src/lib should have 1 child, got ${srcLibNode.children.length}`)
  }

  const utilsNode = srcLibNode.children[0]
  if (utilsNode.path !== '/src/lib/utils.ts') {
    throw new Error(`Expected /src/lib/utils.ts, got ${utilsNode.path}`)
  }
  if (utilsNode.type !== 'file') {
    throw new Error('/src/lib/utils.ts should be a file')
  }

  console.log('✓ testTreeNestedStructure passed')
}

async function testTreeWithPrefix() {
  const storage = new MemoryStorage()
  const fs = new AgenticFileSystem({ storage })

  await storage.set('/docs/readme.md', 'readme')
  await storage.set('/docs/guide.md', 'guide')
  await storage.set('/src/index.ts', 'code')

  const tree = await fs.tree('/docs')

  if (!Array.isArray(tree)) {
    throw new Error('tree() should return an array')
  }

  // Should only return nodes under /docs
  if (tree.length !== 2) {
    throw new Error(`Expected 2 nodes under /docs, got ${tree.length}`)
  }

  for (const node of tree) {
    if (!node.path.startsWith('/docs/')) {
      throw new Error(`All nodes should be under /docs, got ${node.path}`)
    }
    if (node.type !== 'file') {
      throw new Error(`Expected file nodes, got ${node.type}`)
    }
  }

  console.log('✓ testTreeWithPrefix passed')
}

async function testTreeEmpty() {
  const storage = new MemoryStorage()
  const fs = new AgenticFileSystem({ storage })

  const tree = await fs.tree()

  if (!Array.isArray(tree)) {
    throw new Error('tree() should return an array')
  }

  if (tree.length !== 0) {
    throw new Error(`Expected empty array, got ${tree.length} nodes`)
  }

  console.log('✓ testTreeEmpty passed')
}

async function testTreeNodeNames() {
  const storage = new MemoryStorage()
  const fs = new AgenticFileSystem({ storage })

  await storage.set('/docs/readme.md', 'readme')
  await storage.set('/src/lib/utils.ts', 'utils')

  const tree = await fs.tree()

  const docsNode = tree.find(n => n.path === '/docs')
  if (!docsNode) {
    throw new Error('Should have /docs node')
  }
  if (docsNode.name !== 'docs') {
    throw new Error(`Expected name 'docs', got '${docsNode.name}'`)
  }

  const readmeNode = docsNode.children.find(n => n.path === '/docs/readme.md')
  if (!readmeNode) {
    throw new Error('Should have readme.md node')
  }
  if (readmeNode.name !== 'readme.md') {
    throw new Error(`Expected name 'readme.md', got '${readmeNode.name}'`)
  }

  console.log('✓ testTreeNodeNames passed')
}

async function testTreeMetadata() {
  const storage = new MemoryStorage()
  const fs = new AgenticFileSystem({ storage })

  await storage.set('/file.txt', 'content')

  const tree = await fs.tree()

  if (tree.length !== 1) {
    throw new Error(`Expected 1 node, got ${tree.length}`)
  }

  const node = tree[0]

  // MemoryStorage doesn't implement stat(), so size and mtime should be undefined
  if (node.size !== undefined) {
    console.log('  Note: size is populated (backend implements stat())')
  }
  if (node.mtime !== undefined) {
    console.log('  Note: mtime is populated (backend implements stat())')
  }

  console.log('✓ testTreeMetadata passed')
}

// Run all tests
async function runTests() {
  console.log('Running tree() API tests...\n')

  const tests = [
    testTreeFlatStructure,
    testTreeNestedStructure,
    testTreeWithPrefix,
    testTreeEmpty,
    testTreeNodeNames,
    testTreeMetadata
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
