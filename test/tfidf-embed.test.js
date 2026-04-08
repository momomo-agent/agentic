// tfidf-embed.test.js — Tests for TfIdfEmbedBackend

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TfIdfEmbedBackend, MemoryStorage } from '../dist/index.js'

test('TfIdfEmbedBackend: index empty storage', async () => {
  const storage = new MemoryStorage()
  const embed = new TfIdfEmbedBackend()

  await embed.index(storage)
  const results = await embed.search([], 5)

  assert.deepEqual(results, [])
})

test('TfIdfEmbedBackend: encode returns vector of vocab length', async () => {
  const storage = new MemoryStorage()
  await storage.set('/doc1.txt', 'hello world')
  await storage.set('/doc2.txt', 'hello there')

  const embed = new TfIdfEmbedBackend()
  await embed.index(storage)

  const vector = await embed.encode('hello')
  assert.ok(Array.isArray(vector))
  assert.ok(vector.length > 0)
})

test('TfIdfEmbedBackend: search returns at most topK results', async () => {
  const storage = new MemoryStorage()
  await storage.set('/doc1.txt', 'apple banana')
  await storage.set('/doc2.txt', 'banana cherry')
  await storage.set('/doc3.txt', 'cherry date')

  const embed = new TfIdfEmbedBackend()
  await embed.index(storage)

  const query = await embed.encode('banana')
  const results = await embed.search(query, 2)

  assert.equal(results.length, 2)
  assert.ok(results.every(r => typeof r.path === 'string'))
  assert.ok(results.every(r => typeof r.score === 'number'))
})

test('TfIdfEmbedBackend: doc with query terms scores higher', async () => {
  const storage = new MemoryStorage()
  await storage.set('/relevant.txt', 'machine learning artificial intelligence')
  await storage.set('/unrelated.txt', 'cooking recipes food')

  const embed = new TfIdfEmbedBackend()
  await embed.index(storage)

  const query = await embed.encode('machine learning')
  const results = await embed.search(query, 2)

  assert.equal(results[0].path, '/relevant.txt')
  assert.ok(results[0].score > results[1].score)
})

test('TfIdfEmbedBackend: search on empty index returns empty', async () => {
  const embed = new TfIdfEmbedBackend()
  const results = await embed.search([1, 2, 3], 5)

  assert.deepEqual(results, [])
})

test('TfIdfEmbedBackend: topK larger than doc count returns all', async () => {
  const storage = new MemoryStorage()
  await storage.set('/doc1.txt', 'test')
  await storage.set('/doc2.txt', 'test')

  const embed = new TfIdfEmbedBackend()
  await embed.index(storage)

  const query = await embed.encode('test')
  const results = await embed.search(query, 100)

  assert.equal(results.length, 2)
})

test('TfIdfEmbedBackend: handles zero-norm vector', async () => {
  const storage = new MemoryStorage()
  await storage.set('/doc1.txt', 'hello world')

  const embed = new TfIdfEmbedBackend()
  await embed.index(storage)

  const zeroVector = new Array(100).fill(0)
  const results = await embed.search(zeroVector, 5)

  assert.ok(Array.isArray(results))
  assert.ok(results.every(r => r.score === 0))
})

test('TfIdfEmbedBackend: exported from package', async () => {
  const { TfIdfEmbedBackend: Exported } = await import('../dist/index.js')
  assert.ok(Exported)
  assert.equal(typeof Exported, 'function')
})

test('TfIdfEmbedBackend: tokenization is case-insensitive', async () => {
  const storage = new MemoryStorage()
  await storage.set('/doc1.txt', 'Hello World')
  await storage.set('/doc2.txt', 'hello world')

  const embed = new TfIdfEmbedBackend()
  await embed.index(storage)

  const query1 = await embed.encode('HELLO')
  const query2 = await embed.encode('hello')

  const results1 = await embed.search(query1, 2)
  const results2 = await embed.search(query2, 2)

  // Both queries should return same scores
  assert.equal(results1[0].score, results2[0].score)
})

test('TfIdfEmbedBackend: handles special characters', async () => {
  const storage = new MemoryStorage()
  await storage.set('/doc1.txt', 'hello-world, test!')
  await storage.set('/doc2.txt', 'unrelated content')

  const embed = new TfIdfEmbedBackend()
  await embed.index(storage)

  const query = await embed.encode('hello world test')
  const results = await embed.search(query, 2)

  assert.ok(results.length > 0)
  // First result should be doc1 with higher score than doc2
  assert.equal(results[0].path, '/doc1.txt')
  assert.ok(results[0].score > results[1].score)
})
