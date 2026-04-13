/**
 * agentic — 一次 import，所有能力
 *
 * Usage:
 *   import { ask, createMemory, createStore, createTTS } from 'agentic'
 *
 * 每个子库独立可用，agentic 只是统一入口。
 */
;(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory()
  else if (typeof define === 'function' && define.amd) define(factory)
  else root.Agentic = factory()
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict'

  // ── Lazy loader ──────────────────────────────────────────────────
  // Each sub-library is loaded on first access. Missing libs return null.

  const _cache = {}
  function load(name, globalKey) {
    if (_cache[name] !== undefined) return _cache[name]
    let mod = null
    if (globalKey && typeof globalThis !== 'undefined' && globalThis[globalKey]) {
      mod = globalThis[globalKey]
    }
    if (!mod && typeof require === 'function') {
      try { mod = require(name) } catch {}
    }
    _cache[name] = mod
    return mod
  }

  // ── Core (大脑) ──────────────────────────────────────────────────

  function _core() { return load('agentic-core', 'AgenticAgent') }

  /** LLM 调用 */
  function ask(prompt, config, emit) {
    const c = _core()
    if (!c) throw new Error('agentic-core not available')
    const fn = c.agenticAsk || c
    return fn(prompt, config, emit)
  }

  /** 工具注册表 */
  function toolRegistry() {
    const c = _core()
    return c?.toolRegistry || null
  }

  // ── Memory (记忆) ────────────────────────────────────────────────

  function _memory() { return load('agentic-memory', 'AgenticMemory') }

  function createMemory(opts) {
    const m = _memory()
    if (!m) throw new Error('agentic-memory not available')
    return m.createMemory(opts)
  }

  function createManager(opts) {
    const m = _memory()
    if (!m) throw new Error('agentic-memory not available')
    return m.createManager(opts)
  }

  function createKnowledgeStore(opts) {
    const m = _memory()
    if (!m) throw new Error('agentic-memory not available')
    return m.createKnowledgeStore(opts)
  }

  // ── Store (骨骼) ─────────────────────────────────────────────────

  function _store() { return load('agentic-store', 'AgenticStore') }

  function createStore(opts) {
    const s = _store()
    if (!s) throw new Error('agentic-store not available')
    return s.createStore(opts)
  }

  // ── Voice (声音) ─────────────────────────────────────────────────

  function _voice() { return load('agentic-voice', 'AgenticVoice') }

  function createVoice(opts) {
    const v = _voice()
    if (!v) throw new Error('agentic-voice not available')
    return v.createVoice(opts)
  }

  function createTTS(opts) {
    const v = _voice()
    if (!v) throw new Error('agentic-voice not available')
    return v.createTTS(opts)
  }

  function createSTT(opts) {
    const v = _voice()
    if (!v) throw new Error('agentic-voice not available')
    return v.createSTT(opts)
  }

  // ── Sense (眼睛) ─────────────────────────────────────────────────

  function _sense() { return load('agentic-sense', 'AgenticSense') }

  function createSense(opts) {
    const s = _sense()
    if (!s) throw new Error('agentic-sense not available')
    return new s.AgenticSense(opts)
  }

  function createAudio(opts) {
    const s = _sense()
    if (!s) throw new Error('agentic-sense not available')
    return new s.AgenticAudio(opts)
  }

  // ── Act (意志) ───────────────────────────────────────────────────

  function _act() { return load('agentic-act', 'AgenticAct') }

  function createAct(opts) {
    const a = _act()
    if (!a) throw new Error('agentic-act not available')
    return new a.AgenticAct(opts)
  }

  // ── Render (表达) ────────────────────────────────────────────────

  function _render() { return load('agentic-render', 'AgenticRender') }

  function render(markdown, opts) {
    const r = _render()
    if (!r) throw new Error('agentic-render not available')
    return r.render(markdown, opts)
  }

  function renderCSS(theme) {
    const r = _render()
    if (!r) throw new Error('agentic-render not available')
    return r.getCSS(theme)
  }

  // ── Embed (嵌入) ─────────────────────────────────────────────────

  function _embed() { return load('agentic-embed', 'AgenticEmbed') }

  function createIndex(opts) {
    const e = _embed()
    if (!e) throw new Error('agentic-embed not available')
    return e.create(opts)
  }

  function chunkText(text, opts) {
    const e = _embed()
    if (!e) throw new Error('agentic-embed not available')
    return e.chunkText(text, opts)
  }

  function localEmbed(text) {
    const e = _embed() || _memory()
    if (!e) throw new Error('agentic-embed or agentic-memory not available')
    return e.localEmbed(text)
  }

  // ── Filesystem (文件系统) ────────────────────────────────────────

  function _fs() { return load('agentic-filesystem') }

  function createFileSystem(backend) {
    const f = _fs()
    if (!f) throw new Error('agentic-filesystem not available')
    return new f.AgenticFileSystem(backend)
  }

  // ── Shell (命令执行) ─────────────────────────────────────────────

  function _shell() { return load('agentic-shell') }

  function createShell(opts) {
    const s = _shell()
    if (!s) throw new Error('agentic-shell not available')
    return new s.AgenticShell(opts)
  }

  // ── Spatial (空间推理) ───────────────────────────────────────────

  function _spatial() { return load('agentic-spatial') }

  function reconstructSpace(opts) {
    const s = _spatial()
    if (!s) throw new Error('agentic-spatial not available')
    return s.reconstructSpace(opts)
  }

  function createSpatialSession(opts) {
    const s = _spatial()
    if (!s) throw new Error('agentic-spatial not available')
    return new s.SpatialSession(opts)
  }

  // ── Agent (完整运行时) ───────────────────────────────────────────

  function _claw() { return load('agentic-claw') }

  function createAgent(opts) {
    const c = _claw()
    if (!c) throw new Error('agentic-claw not available')
    return c.createClaw(opts)
  }

  // ── Capabilities ─────────────────────────────────────────────────

  function capabilities() {
    return {
      core: !!_core(),
      memory: !!_memory(),
      store: !!_store(),
      voice: !!_voice(),
      sense: !!_sense(),
      act: !!_act(),
      render: !!_render(),
      embed: !!_embed(),
      filesystem: !!_fs(),
      shell: !!_shell(),
      spatial: !!_spatial(),
      agent: !!_claw(),
    }
  }

  // ── Public API ───────────────────────────────────────────────────

  return {
    // Core
    ask,
    toolRegistry,

    // Memory
    createMemory,
    createManager,
    createKnowledgeStore,

    // Store
    createStore,

    // Voice
    createVoice,
    createTTS,
    createSTT,

    // Sense
    createSense,
    createAudio,

    // Act
    createAct,

    // Render
    render,
    renderCSS,

    // Embed
    createIndex,
    chunkText,
    localEmbed,

    // Filesystem
    createFileSystem,

    // Shell
    createShell,

    // Spatial
    reconstructSpace,
    createSpatialSession,

    // Agent (full runtime)
    createAgent,

    // Discovery
    capabilities,
  }
})
