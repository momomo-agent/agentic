import { get, set, del } from '../store/index.js'
import { embed } from './embed.js'

const INDEX_KEY = 'memory:__index'

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export async function add(text, metadata = {}) {
  const vector = await embed(text)
  const id = generateId()
  const entry = { id, text, vector, metadata, createdAt: Date.now() }
  await set(`memory:${id}`, entry)
  const index = (await get(INDEX_KEY)) ?? []
  index.push(id)
  await set(INDEX_KEY, index)
  return id
}

export async function search(query, topK = 5) {
  const queryVec = await embed(query)
  const index = (await get(INDEX_KEY)) ?? []
  const scored = []
  for (const id of index) {
    const entry = await get(`memory:${id}`)
    if (!entry) continue
    const score = cosineSimilarity(queryVec, entry.vector)
    scored.push({ id: entry.id, text: entry.text, metadata: entry.metadata, score })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, topK)
}

export async function remove(id) {
  await del(`memory:${id}`)
  const index = (await get(INDEX_KEY)) ?? []
  const updated = index.filter(i => i !== id)
  await set(INDEX_KEY, updated)
}

export async function clear() {
  const index = (await get(INDEX_KEY)) ?? []
  for (const id of index) await del(`memory:${id}`)
  await del(INDEX_KEY)
}
