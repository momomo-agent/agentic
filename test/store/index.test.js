import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn()
}

vi.mock('agentic-store', () => ({
  open: vi.fn(async () => mockStore)
}))

// Reset singleton between tests
beforeEach(async () => {
  vi.resetModules()
  mockStore.get.mockReset()
  mockStore.set.mockReset()
  mockStore.delete.mockReset()
})

async function getStore() {
  const { get, set, del } = await import('../../src/store/index.js')
  return { get, set, del }
}

describe('store', () => {
  it('DBB-003: set then get returns value', async () => {
    mockStore.set.mockResolvedValue()
    mockStore.get.mockResolvedValue(JSON.stringify('value'))
    const { get, set } = await getStore()
    await set('key', 'value')
    expect(await get('key')).toBe('value')
  })

  it('DBB-004: delete then get returns null', async () => {
    mockStore.delete.mockResolvedValue()
    mockStore.get.mockResolvedValue(null)
    const { get, del } = await getStore()
    await del('k')
    expect(await get('k')).toBeNull()
  })

  it('DBB-005: get nonexistent key returns null', async () => {
    mockStore.get.mockResolvedValue(null)
    const { get } = await getStore()
    expect(await get('nonexistent')).toBeNull()
  })

  it('stores complex values as JSON', async () => {
    const obj = { a: 1, b: [2, 3] }
    mockStore.set.mockResolvedValue()
    mockStore.get.mockResolvedValue(JSON.stringify(obj))
    const { get, set } = await getStore()
    await set('obj', obj)
    expect(mockStore.set).toHaveBeenCalledWith('obj', JSON.stringify(obj))
    expect(await get('obj')).toEqual(obj)
  })

  it('del on missing key is no-op', async () => {
    mockStore.delete.mockResolvedValue()
    const { del } = await getStore()
    await expect(del('missing')).resolves.toBeUndefined()
  })
})
