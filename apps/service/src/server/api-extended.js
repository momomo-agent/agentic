/**
 * Extended API routes — expose all agentic-* sub-library capabilities.
 *
 * Routes are registered synchronously. Sub-libraries are lazy-imported
 * on first request so createApp() stays sync-compatible with existing tests.
 */

// ── Lazy module cache ───────────────────────────────────────────────
const _cache = {};
async function load(name) {
  if (_cache[name] !== undefined) return _cache[name];
  try { _cache[name] = await import(name); } catch { _cache[name] = null; }
  return _cache[name];
}

let _upload;
async function getUpload() {
  if (_upload) return _upload;
  const multer = (await import('multer')).default;
  _upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
  return _upload;
}

// Middleware that lazy-loads multer
function lazyUploadSingle(fieldName) {
  return async (req, res, next) => {
    try {
      const upload = await getUpload();
      upload.single(fieldName)(req, res, next);
    } catch (e) { next(e); }
  };
}
function lazyUploadArray(fieldName, maxCount) {
  return async (req, res, next) => {
    try {
      const upload = await getUpload();
      upload.array(fieldName, maxCount)(req, res, next);
    } catch (e) { next(e); }
  };
}

// ── Shared instances ────────────────────────────────────────────────
const _inst = {};

function wrap(fn) {
  return async (req, res, next) => {
    try { await fn(req, res); } catch (e) {
      console.error(`[api-ext] ${req.method} ${req.path}:`, e.message);
      if (!res.headersSent) res.status(500).json({ error: e.message });
    }
  };
}

export function addExtendedRoutes(r) {

  // ═══════════════════════════════════════════════════════════════════
  // 1. agentic-store — KV storage
  // ═══════════════════════════════════════════════════════════════════

  r.get('/api/store/keys', wrap(async (_req, res) => {
    const m = await load('agentic-store');
    if (!m) return res.status(501).json({ error: 'agentic-store not available' });
    if (!_inst.store) { _inst.store = m.createStore({ backend: 'sqlite' }); await _inst.store.init(); }
    res.json(await _inst.store.kvKeys());
  }));

  r.get('/api/store/get/:key', wrap(async (req, res) => {
    const m = await load('agentic-store');
    if (!m) return res.status(501).json({ error: 'agentic-store not available' });
    if (!_inst.store) { _inst.store = m.createStore({ backend: 'sqlite' }); await _inst.store.init(); }
    const val = await _inst.store.kvGet(req.params.key);
    if (val === undefined) return res.status(404).json({ error: 'not found' });
    res.json({ key: req.params.key, value: val });
  }));

  r.put('/api/store/set', wrap(async (req, res) => {
    const m = await load('agentic-store');
    if (!m) return res.status(501).json({ error: 'agentic-store not available' });
    if (!_inst.store) { _inst.store = m.createStore({ backend: 'sqlite' }); await _inst.store.init(); }
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: 'key required' });
    await _inst.store.kvSet(key, value);
    res.json({ ok: true });
  }));

  r.delete('/api/store/delete/:key', wrap(async (req, res) => {
    const m = await load('agentic-store');
    if (!m) return res.status(501).json({ error: 'agentic-store not available' });
    if (!_inst.store) { _inst.store = m.createStore({ backend: 'sqlite' }); await _inst.store.init(); }
    await _inst.store.kvDelete(req.params.key);
    res.json({ ok: true });
  }));

  r.get('/api/store/has/:key', wrap(async (req, res) => {
    const m = await load('agentic-store');
    if (!m) return res.status(501).json({ error: 'agentic-store not available' });
    if (!_inst.store) { _inst.store = m.createStore({ backend: 'sqlite' }); await _inst.store.init(); }
    res.json({ exists: await _inst.store.kvHas(req.params.key) });
  }));

  // ═══════════════════════════════════════════════════════════════════
  // 2. agentic-memory — session + knowledge management
  // ═══════════════════════════════════════════════════════════════════

  r.get('/api/memory/sessions', wrap(async (_req, res) => {
    const m = await load('agentic-memory');
    if (!m) return res.status(501).json({ error: 'agentic-memory not available' });
    if (!_inst.memMgr) _inst.memMgr = m.createManager();
    res.json(_inst.memMgr.listSessions());
  }));

  r.post('/api/memory/sessions', wrap(async (req, res) => {
    const m = await load('agentic-memory');
    if (!m) return res.status(501).json({ error: 'agentic-memory not available' });
    if (!_inst.memMgr) _inst.memMgr = m.createManager();
    const { id, options } = req.body;
    _inst.memMgr.session(id, options);
    res.json({ id, created: true });
  }));

  r.get('/api/memory/sessions/:id', wrap(async (req, res) => {
    const m = await load('agentic-memory');
    if (!m) return res.status(501).json({ error: 'agentic-memory not available' });
    if (!_inst.memMgr) _inst.memMgr = m.createManager();
    const session = _inst.memMgr.session(req.params.id);
    res.json({ id: req.params.id, messages: session.messages || [] });
  }));

  r.delete('/api/memory/sessions/:id', wrap(async (req, res) => {
    const m = await load('agentic-memory');
    if (!m) return res.status(501).json({ error: 'agentic-memory not available' });
    if (!_inst.memMgr) _inst.memMgr = m.createManager();
    _inst.memMgr.deleteSession(req.params.id);
    res.json({ ok: true });
  }));

  r.post('/api/memory/learn', wrap(async (req, res) => {
    const m = await load('agentic-memory');
    if (!m) return res.status(501).json({ error: 'agentic-memory not available' });
    if (!_inst.memMgr) _inst.memMgr = m.createManager();
    const { id, text, metadata } = req.body;
    if (!id || !text) return res.status(400).json({ error: 'id and text required' });
    await _inst.memMgr.learn(id, text, metadata);
    res.json({ ok: true });
  }));

  r.post('/api/memory/recall', wrap(async (req, res) => {
    const m = await load('agentic-memory');
    if (!m) return res.status(501).json({ error: 'agentic-memory not available' });
    if (!_inst.memMgr) _inst.memMgr = m.createManager();
    const { query, topK, threshold } = req.body;
    if (!query) return res.status(400).json({ error: 'query required' });
    res.json(await _inst.memMgr.recall(query, { topK, threshold }));
  }));

  r.delete('/api/memory/forget/:id', wrap(async (req, res) => {
    const m = await load('agentic-memory');
    if (!m) return res.status(501).json({ error: 'agentic-memory not available' });
    if (!_inst.memMgr) _inst.memMgr = m.createManager();
    await _inst.memMgr.forget(req.params.id);
    res.json({ ok: true });
  }));

  // ═══════════════════════════════════════════════════════════════════
  // 3. agentic-filesystem — file operations
  // ═══════════════════════════════════════════════════════════════════

  async function getFs() {
    const m = await load('agentic-filesystem');
    if (!m) return null;
    if (!_inst.fs) { _inst.fs = new m.AgenticFileSystem(new m.NodeFsBackend()); }
    return _inst.fs;
  }

  r.get('/api/fs/read', wrap(async (req, res) => {
    const afs = await getFs();
    if (!afs) return res.status(501).json({ error: 'agentic-filesystem not available' });
    const { path } = req.query;
    if (!path) return res.status(400).json({ error: 'path required' });
    res.json({ path, content: await afs.read(path) });
  }));

  r.post('/api/fs/write', wrap(async (req, res) => {
    const afs = await getFs();
    if (!afs) return res.status(501).json({ error: 'agentic-filesystem not available' });
    const { path, content } = req.body;
    if (!path) return res.status(400).json({ error: 'path required' });
    await afs.write(path, content);
    res.json({ ok: true });
  }));

  r.get('/api/fs/ls', wrap(async (req, res) => {
    const afs = await getFs();
    if (!afs) return res.status(501).json({ error: 'agentic-filesystem not available' });
    res.json(await afs.ls(req.query.path || '/'));
  }));

  r.get('/api/fs/tree', wrap(async (req, res) => {
    const afs = await getFs();
    if (!afs) return res.status(501).json({ error: 'agentic-filesystem not available' });
    res.json(await afs.tree(req.query.path || '/'));
  }));

  r.delete('/api/fs/delete', wrap(async (req, res) => {
    const afs = await getFs();
    if (!afs) return res.status(501).json({ error: 'agentic-filesystem not available' });
    const { path } = req.query;
    if (!path) return res.status(400).json({ error: 'path required' });
    await afs.delete(path);
    res.json({ ok: true });
  }));

  r.post('/api/fs/grep', wrap(async (req, res) => {
    const afs = await getFs();
    if (!afs) return res.status(501).json({ error: 'agentic-filesystem not available' });
    const { pattern, options } = req.body;
    if (!pattern) return res.status(400).json({ error: 'pattern required' });
    res.json(await afs.grep(pattern, options));
  }));

  r.post('/api/fs/mkdir', wrap(async (req, res) => {
    const afs = await getFs();
    if (!afs) return res.status(501).json({ error: 'agentic-filesystem not available' });
    const { path } = req.body;
    if (!path) return res.status(400).json({ error: 'path required' });
    await afs.write(path + '/.keep', '');
    res.json({ ok: true });
  }));

  // ═══════════════════════════════════════════════════════════════════
  // 4. agentic-shell — command execution
  // ═══════════════════════════════════════════════════════════════════

  r.post('/api/shell/exec', wrap(async (req, res) => {
    const m = await load('agentic-shell');
    if (!m) return res.status(501).json({ error: 'agentic-shell not available' });
    if (!_inst.shell) _inst.shell = new m.AgenticShell();
    const { command } = req.body;
    if (!command) return res.status(400).json({ error: 'command required' });
    res.json(await _inst.shell.exec(command));
  }));

  r.get('/api/shell/jobs', wrap(async (_req, res) => {
    const m = await load('agentic-shell');
    if (!m) return res.status(501).json({ error: 'agentic-shell not available' });
    if (!_inst.shell) _inst.shell = new m.AgenticShell();
    res.json(await _inst.shell.jobs_cmd([]));
  }));

  // ═══════════════════════════════════════════════════════════════════
  // 5. agentic-act — AI decision + action execution
  // ═══════════════════════════════════════════════════════════════════

  r.post('/api/act/decide', wrap(async (req, res) => {
    const m = await load('agentic-act');
    if (!m) return res.status(501).json({ error: 'agentic-act not available' });
    const { input, actions, apiKey, model, baseUrl } = req.body;
    if (!input) return res.status(400).json({ error: 'input required' });
    const act = new m.AgenticAct({ actions, apiKey, model, baseUrl });
    res.json(await act.decide(input));
  }));

  r.post('/api/act/run', wrap(async (req, res) => {
    const m = await load('agentic-act');
    if (!m) return res.status(501).json({ error: 'agentic-act not available' });
    const { input, actions, apiKey, model, baseUrl } = req.body;
    if (!input) return res.status(400).json({ error: 'input required' });
    const act = new m.AgenticAct({ actions, apiKey, model, baseUrl });
    res.json(await act.run(input));
  }));

  // ═══════════════════════════════════════════════════════════════════
  // 6. agentic-render — markdown rendering
  // ═══════════════════════════════════════════════════════════════════

  r.post('/api/render', wrap(async (req, res) => {
    const m = await load('agentic-render');
    if (!m) return res.status(501).json({ error: 'agentic-render not available' });
    const { markdown, theme } = req.body;
    if (!markdown) return res.status(400).json({ error: 'markdown required' });
    const t = theme === 'dark' ? m.THEME_DARK : m.THEME_LIGHT;
    res.json({ html: m.render(markdown, { theme: t }) });
  }));

  r.get('/api/render/css', wrap(async (req, res) => {
    const m = await load('agentic-render');
    if (!m) return res.status(501).json({ error: 'agentic-render not available' });
    const t = req.query.theme === 'dark' ? m.THEME_DARK : m.THEME_LIGHT;
    res.type('text/css').send(m.getCSS(t));
  }));

  // ═══════════════════════════════════════════════════════════════════
  // 7. agentic-sense — perception (audio VAD, frame extraction)
  // ═══════════════════════════════════════════════════════════════════

  r.post('/api/sense/detect', lazyUploadSingle('audio'), wrap(async (req, res) => {
    const m = await load('agentic-sense');
    if (!m) return res.status(501).json({ error: 'agentic-sense not available' });
    if (!req.file) return res.status(400).json({ error: 'audio file required' });
    const audio = new m.AgenticAudio();
    res.json(audio.detectVAD(req.file.buffer));
  }));

  r.post('/api/sense/frame', lazyUploadSingle('video'), wrap(async (req, res) => {
    const m = await load('agentic-sense');
    if (!m) return res.status(501).json({ error: 'agentic-sense not available' });
    if (!req.file) return res.status(400).json({ error: 'video file required' });
    const frame = await m.extractFrame(req.file.buffer, { timestamp: parseFloat(req.body.timestamp) || 0 });
    res.type('image/jpeg').send(frame);
  }));

  r.get('/api/sense/capabilities', wrap(async (_req, res) => {
    const m = await load('agentic-sense');
    res.json({ vad: !!m, frameExtraction: !!(m?.extractFrame), audioProcessing: !!m });
  }));

  // ═══════════════════════════════════════════════════════════════════
  // 8. agentic-spatial — 3D spatial reasoning
  // ═══════════════════════════════════════════════════════════════════

  const _spatialSessions = new Map();

  r.post('/api/spatial/reconstruct', lazyUploadArray('images', 20), wrap(async (req, res) => {
    const m = await load('agentic-spatial');
    if (!m) return res.status(501).json({ error: 'agentic-spatial not available' });
    if (!req.files?.length) return res.status(400).json({ error: 'images required' });
    const { apiKey, model, baseUrl } = req.body;
    const images = req.files.map(f => f.buffer);
    res.json(await m.reconstructSpace({ images, apiKey, model, baseUrl }));
  }));

  r.post('/api/spatial/sessions', wrap(async (req, res) => {
    const m = await load('agentic-spatial');
    if (!m) return res.status(501).json({ error: 'agentic-spatial not available' });
    const { id, apiKey, model, baseUrl } = req.body;
    const sid = id || `spatial_${Date.now()}`;
    _spatialSessions.set(sid, new m.SpatialSession({ apiKey, model, baseUrl }));
    res.json({ id: sid });
  }));

  r.post('/api/spatial/sessions/:id/analyze', lazyUploadArray('images', 20), wrap(async (req, res) => {
    const s = _spatialSessions.get(req.params.id);
    if (!s) return res.status(404).json({ error: 'session not found' });
    res.json(await s.analyze(req.files.map(f => f.buffer)));
  }));

  r.get('/api/spatial/sessions/:id', wrap(async (req, res) => {
    const s = _spatialSessions.get(req.params.id);
    if (!s) return res.status(404).json({ error: 'session not found' });
    res.json({ id: req.params.id, state: s.state || {} });
  }));

  // ═══════════════════════════════════════════════════════════════════
  // 9. agentic-embed — text embedding + vector search
  // ═══════════════════════════════════════════════════════════════════

  const _indices = new Map();

  r.post('/api/embed/index', wrap(async (req, res) => {
    const m = await load('agentic-embed');
    if (!m) return res.status(501).json({ error: 'agentic-embed not available' });
    const { id, text, metadata, indexName } = req.body;
    if (!id || !text) return res.status(400).json({ error: 'id and text required' });
    const name = indexName || 'default';
    if (!_indices.has(name)) _indices.set(name, m.create());
    await _indices.get(name).add(id, text, metadata);
    res.json({ ok: true });
  }));

  r.post('/api/embed/search', wrap(async (req, res) => {
    const m = await load('agentic-embed');
    if (!m) return res.status(501).json({ error: 'agentic-embed not available' });
    const { query, topK, indexName } = req.body;
    if (!query) return res.status(400).json({ error: 'query required' });
    const idx = _indices.get(indexName || 'default');
    if (!idx) return res.json([]);
    res.json(await idx.search(query, { topK: topK || 5 }));
  }));

  r.post('/api/embed/chunk', wrap(async (req, res) => {
    const m = await load('agentic-embed');
    if (!m) return res.status(501).json({ error: 'agentic-embed not available' });
    const { text, options } = req.body;
    if (!text) return res.status(400).json({ error: 'text required' });
    res.json(m.chunkText(text, options));
  }));

  r.delete('/api/embed/index/:name', wrap(async (req, res) => {
    _indices.delete(req.params.name);
    res.json({ ok: true });
  }));

  // ═══════════════════════════════════════════════════════════════════
  // 10. agentic-claw — full agent runtime
  // ═══════════════════════════════════════════════════════════════════

  const _agents = new Map();

  r.post('/api/agent/create', wrap(async (req, res) => {
    const m = await load('agentic-claw');
    if (!m) return res.status(501).json({ error: 'agentic-claw not available' });
    const { id, apiKey, model, baseUrl, provider, system, skills } = req.body;
    if (!id) return res.status(400).json({ error: 'id required' });
    _agents.set(id, m.createClaw({ apiKey, model, baseUrl, provider, system, skills }));
    res.json({ id, created: true });
  }));

  r.post('/api/agent/:id/chat', wrap(async (req, res) => {
    const claw = _agents.get(req.params.id);
    if (!claw) return res.status(404).json({ error: 'agent not found' });
    const { message, stream } = req.body;
    if (!message) return res.status(400).json({ error: 'message required' });
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      const result = await claw.chat(message, (ev) => { res.write(`data: ${JSON.stringify(ev)}\n\n`); });
      res.write(`data: ${JSON.stringify({ type: 'done', content: result })}\n\n`);
      res.end();
    } else {
      res.json({ content: await claw.chat(message) });
    }
  }));

  r.get('/api/agent/:id', wrap(async (req, res) => {
    if (!_agents.has(req.params.id)) return res.status(404).json({ error: 'agent not found' });
    res.json({ id: req.params.id, active: true });
  }));

  r.delete('/api/agent/:id', wrap(async (req, res) => {
    _agents.delete(req.params.id);
    res.json({ ok: true });
  }));

  r.get('/api/agents', wrap(async (_req, res) => {
    res.json([..._agents.keys()]);
  }));

  r.post('/api/agent/:id/learn', wrap(async (req, res) => {
    const claw = _agents.get(req.params.id);
    if (!claw) return res.status(404).json({ error: 'agent not found' });
    const { id: docId, text, metadata } = req.body;
    await claw.learn(docId, text, metadata);
    res.json({ ok: true });
  }));

  r.post('/api/agent/:id/recall', wrap(async (req, res) => {
    const claw = _agents.get(req.params.id);
    if (!claw) return res.status(404).json({ error: 'agent not found' });
    const { query, topK } = req.body;
    res.json(await claw.recall(query, { topK }));
  }));

  // ═══════════════════════════════════════════════════════════════════
  // Capabilities discovery
  // ═══════════════════════════════════════════════════════════════════

  r.get('/api/capabilities', wrap(async (_req, res) => {
    const checks = await Promise.all([
      load('agentic-store'), load('agentic-memory'), load('agentic-filesystem'),
      load('agentic-shell'), load('agentic-act'), load('agentic-render'),
      load('agentic-sense'), load('agentic-spatial'), load('agentic-embed'),
      load('agentic-claw'),
    ]);
    const [store, memory, filesystem, shell, act, render, sense, spatial, embed, claw] = checks;
    res.json({
      store: !!store, memory: !!memory, filesystem: !!filesystem,
      shell: !!shell, act: !!act, render: !!render,
      sense: !!sense, spatial: !!spatial, embed: !!embed, claw: !!claw,
      chat: true, voice: true, embeddings: true,
    });
  }));
}
