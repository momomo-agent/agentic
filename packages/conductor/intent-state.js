/**
 * intent-state.js — Persistent intent registry
 *
 * Talker writes intents here. Dispatcher reads and reacts.
 * Pure data layer — no LLM, no scheduling logic.
 */
;(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory()
  else root.IntentState = factory()
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict'

  function createIntentState(opts = {}) {
    const _listeners = []
    let _intents = {}
    let _nextId = 1
    const _store = opts.store || null
    const STORE_KEY = 'conductor/intents'

    // --- Persistence (async, fire-and-forget on writes) ---

    function _save() {
      if (!_store) return
      try { _store.set(STORE_KEY, JSON.stringify({ intents: _intents, nextId: _nextId })) } catch {}
    }

    async function _restore() {
      if (!_store) return
      try {
        const raw = await _store.get(STORE_KEY)
        if (raw) {
          const data = typeof raw === 'string' ? JSON.parse(raw) : raw
          _intents = data.intents || {}
          _nextId = data.nextId || 1
        }
      } catch {}
    }

    function _notify(type, intent) {
      for (const fn of _listeners) {
        try { fn(type, intent) } catch (e) { console.error('[IntentState] listener error:', e) }
      }
    }

    // --- CRUD ---

    function create(goal, options = {}) {
      const id = `intent-${_nextId++}`
      const intent = {
        id,
        goal,
        status: 'active',
        dependsOn: options.dependsOn || [],
        priority: options.priority ?? 1,
        progress: null,
        artifacts: [],
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      _intents[id] = intent
      _save()
      _notify('create', intent)
      return { ...intent }
    }

    function update(id, changes) {
      const intent = _intents[id]
      if (!intent) return null

      if (changes.goal) intent.goal = changes.goal
      if (changes.message) intent.messages.push(changes.message)
      if (changes.progress) intent.progress = changes.progress
      if (changes.priority != null) intent.priority = changes.priority

      // Artifacts: merge, dedupe by path
      if (changes.artifacts && changes.artifacts.length > 0) {
        const existing = new Set(intent.artifacts.map(a => typeof a === 'string' ? a : a.path))
        for (const a of changes.artifacts) {
          const key = typeof a === 'string' ? a : a.path
          if (!existing.has(key)) {
            intent.artifacts.push(a)
            existing.add(key)
          }
        }
      }

      intent.updatedAt = Date.now()
      _save()
      _notify('update', intent)
      return { ...intent }
    }

    function setStatus(id, status) {
      const intent = _intents[id]
      if (!intent) return null
      intent.status = status
      intent.updatedAt = Date.now()
      _save()
      _notify(status, intent)
      return { ...intent }
    }

    function cancel(id) { return setStatus(id, 'cancelled') }
    function running(id) { return setStatus(id, 'running') }
    function done(id) { return setStatus(id, 'done') }
    function fail(id) { return setStatus(id, 'failed') }

    function get(id) {
      const intent = _intents[id]
      return intent ? { ...intent } : null
    }

    function getAll() {
      return Object.values(_intents).map(i => ({ ...i }))
    }

    function getActive() {
      return Object.values(_intents)
        .filter(i => !['done', 'failed', 'cancelled'].includes(i.status))
        .map(i => ({ ...i }))
    }

    function onChange(fn) {
      _listeners.push(fn)
      return () => {
        const idx = _listeners.indexOf(fn)
        if (idx >= 0) _listeners.splice(idx, 1)
      }
    }

    // Format intents for Talker context injection
    function formatForTalker(opts = {}) {
      const includeSettled = opts.includeSettled || false
      const all = Object.values(_intents).map(i => ({ ...i }))
      const items = includeSettled ? all : all.filter(i => !['done', 'failed', 'cancelled'].includes(i.status))
      if (items.length === 0) return ''

      const lines = items.map(i => {
        let line = `- [${i.status}] ${i.goal}`
        if (i.progress) line += ` (${i.progress})`
        if (i.dependsOn.length > 0) {
          const depStatus = i.dependsOn.map(depId => {
            const dep = _intents[depId]
            return dep ? `${dep.goal.slice(0, 30)}:${dep.status}` : `${depId}:unknown`
          })
          line += ` [waiting on: ${depStatus.join(', ')}]`
        }
        return line
      })
      return `Intents:\n${lines.join('\n')}`
    }

    function markReported(...ids) {
      for (const id of ids) {
        if (_intents[id]) _intents[id]._reported = true
      }
    }

    function reset() {
      _intents = {}
      _nextId = 1
      _listeners.length = 0
    }

    // Init — return a promise for async restore
    const _ready = _restore()

    const api = {
      create, update, cancel, running, done, fail,
      get, getAll, getActive, onChange, formatForTalker, reset,
      setStatus, markReported,
      ready: _ready,
    }
    return api
  }

  return { createIntentState }
})
