// Task task-1775581761671: Search tool graceful degradation without API key
import { describe, it, expect } from 'vitest'
import { executeSearch } from '../src/tools/search.js'

describe('m25 search graceful degradation', () => {
  it('returns graceful message when no apiKey (tavily default)', async () => {
    const result = await executeSearch({ query: 'test' }, undefined)
    expect(result.text).toContain('API key')
    expect(result.sources).toEqual([])
  })

  it('returns graceful message when no apiKey (serper)', async () => {
    const result = await executeSearch({ query: 'test' }, { provider: 'serper' })
    expect(result.text).toContain('API key')
    expect(result.sources).toEqual([])
  })

  it('returns graceful message for empty apiKey', async () => {
    const result = await executeSearch({ query: 'test' }, { apiKey: '' })
    expect(result.text).toContain('API key')
    expect(result.sources).toEqual([])
  })

  it('returns graceful message for empty query', async () => {
    const result = await executeSearch({ query: '' }, undefined)
    expect(result.text).toBe('No query provided')
    expect(result.sources).toEqual([])
  })
})
