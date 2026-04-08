import { open } from 'agentic-store'
import { homedir } from 'os'
import { join } from 'path'

const DB_PATH = join(homedir(), '.agentic-service', 'store.db')
let _store = null

async function getStore() {
  if (!_store) _store = await open(DB_PATH)
  return _store
}

export async function get(key) {
  const store = await getStore()
  const val = await store.get(key)
  return val == null ? null : JSON.parse(val)
}

export async function set(key, value) {
  const store = await getStore()
  await store.set(key, JSON.stringify(value))
}

export async function del(key) {
  const store = await getStore()
  await store.delete(key)
}

export { del as delete };
