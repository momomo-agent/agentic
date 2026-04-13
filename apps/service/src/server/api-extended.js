/**
 * Extended API routes — expose all agentic capabilities through claw.
 *
 * One library to rule them all: agentic-claw lazy-loads sub-libraries
 * and provides unified access. Service just maps HTTP → claw methods.
 */

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
function lazyUploadSingle(field) {
  return async (req, res, next) => {
    try { (await getUpload()).single(field)(req, res, next); } catch (e) { next(e); }
  };
}
function lazyUploadArray(field, max) {
  return async (req, res, next) => {
    try { (await getUpload()).array(field, max)(req, res, next); } catch (e) { next(e); }
  };
}

function wrap(fn) {
  return async (req, res) => {
    try { await fn(req, res); } catch (e) {
      console.error(`[api-ext] ${req.method} ${req.path}:`, e.message);
      if (!res.headersSent) res.status(500).json({ error: e.message });
    }
  };
}

// ── Agent registry ──────────────────────────────────────────────────
// Each agent is a claw instance. Created via POST /api/agent/create.
const _agents = new Map();

async function getClaw() {
  return await load('agentic-claw');
}

export function addExtendedRoutes(r) {

  // ═══════════════════════════════════════════════════════════════════
  // Agent lifecycle — create / chat / learn / recall / destroy
  // ═══════════════════════════════════════════════════════════════════

  r.post('/api/agent/create', wrap(async (req, res) => {
    const m = await getClaw();
    if (!m) return res.status(501).json({ error: 'agentic-claw not available' });
    const { id, apiKey, model, baseUrl, provider, system, skills, knowledge } = req.body;
    if (!id) return res.status(400).json({ error: 'id required' });
    if (!apiKey) return res.status(400).json({ error: 'apiKey required' });
    const claw = m.createClaw({ apiKey, model, baseUrl, provider, systemPrompt: system, skills, knowledge });
    _agents.set(id, claw);
    res.json({ id, created: true, capabilities: claw.capabilities() });
  }));

  r.post('/api/agent/:id/chat', wrap(async (req, res) => {
    const claw = _agents.get(req.params.id);
    if (!claw) return res.status(404).json({ error: 'agent not found' });
    const { message, session, stream } = req.body;
    if (!message) return res.status(400).json({ error: 'message required' });
    const target = session ? claw.session(session) : claw;
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      const result = await target.chat(message, (ev) => { res.write(`data: ${JSON.stringify(ev)}\n\n`); });
      res.write(`data: ${JSON.stringify({ type: 'done', ...result })}\n\n`);
      res.end();
    } else {
      res.json(await target.chat(message));
    }
  }));

  r.get('/api/agent/:id', wrap(async (req, res) => {
    const claw = _agents.get(req.params.id);
    if (!claw) return res.status(404).json({ error: 'agent not found' });
    res.json({ id: req.params.id, sessions: claw.sessions(), capabilities: claw.capabilities(), skills: claw.listSkills() });
  }));

  r.delete('/api/agent/:id', wrap(async (req, res) => {
    const claw = _agents.get(req.params.id);
    if (claw) claw.destroy();
    _agents.delete(req.params.id);
    res.json({ ok: true });
  }));

  r.get('/api/agents', wrap(async (_req, res) => {
    res.json([..._agents.keys()]);
  }));

  // ── Agent knowledge ───────────────────────────────────────────────

  r.post('/api/agent/:id/learn', wrap(async (req, res) => {
    const claw = _agents.get(req.params.id);
    if (!claw) return res.status(404).json({ error: 'agent not found' });
    const { id: docId, text, metadata } = req.body;
    if (!docId || !text) return res.status(400).json({ error: 'id and text required' });
    await claw.learn(docId, text, metadata);
    res.json({ ok: true });
  }));

  r.post('/api/agent/:id/recall', wrap(async (req, res) => {
    const claw = _agents.get(req.params.id);
    if (!claw) return res.status(404).json({ error: 'agent not found' });
    const { query, topK } = req.body;
    if (!query) return res.status(400).json({ error: 'query required' });
    res.json(await claw.recall(query, { topK }));
  }));

  r.post('/api/agent/:id/forget', wrap(async (req, res) => {
    const claw = _agents.get(req.params.id);
    if (!claw) return res.status(404).json({ error: 'agent not found' });
    const { id: docId } = req.body;
    if (!docId) return res.status(400).json({ error: 'id required' });
    await claw.forget(docId);
    res.json({ ok: true });
  }));

  // ── Agent skills ──────────────────────────────────────────────────

  r.post('/api/agent/:id/skills', wrap(async (req, res) => {
    const claw = _agents.get(req.params.id);
    if (!claw) return res.status(404).json({ error: 'agent not found' });
    const { skill } = req.body;
    if (!skill) return res.status(400).json({ error: 'skill required' });
    claw.use(skill);
    res.json({ ok: true, skills: claw.listSkills() });
  }));

  r.get('/api/agent/:id/skills', wrap(async (req, res) => {
    const claw = _agents.get(req.params.id);
    if (!claw) return res.status(404).json({ error: 'agent not found' });
    res.json(claw.listSkills());
  }));

  // ═══════════════════════════════════════════════════════════════════
  // Sub-library passthrough — access via agent's claw instance
  // ═══════════════════════════════════════════════════════════════════

  // ── Store ─────────────────────────────────────────────────────────

  r.get('/api/agent/:id/store/keys', wrap(async (req, res) => {
    const claw = _agents.get(req.params.id);
    if (!claw) return res.status(404).json({ error: 'agent not found' });
    if (!claw.store) return res.status(501).json({ error: 'store not available' });
    res.json(await claw.store.kvKeys());
  }));

  r.get('/api/agent/:id/store/get/:key', wrap(async (req, res) => {
    const claw = _agents.get(req.params.id);
    if (!claw) return res.status(404).json({ error: 'agent not found' });
    if (!claw.store) return res.status(501).json({ error: 'store not available' });
    const val = await claw.store.kvGet(req.params.key);
    if (val === undefined) return res.status(404).json({ error: 'not found' });
    res.json({ key: req.params.key, value: val });
  }));

  r.put('/api/agent/:id/store/set', wrap(async (req, res) => {
    const claw = _agents.get(req.params.id);
    if (!claw) return res.status(404).json({ error: 'agent not found' });
    if (!claw.store) return res.status(501).json({ error: 'store not available' });
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: 'key required' });
    await claw.store.kvSet(key, value);
    res.json({ ok: true });
  }));

  r.delete('/api/agent/:id/store/delete/:key', wrap(async (req, res) => {
    const claw = _agents.get(req.params.id);
    if (!claw) return res.status(404).json({ error: 'agent not found' });
    if (!claw.store) return res.status(501).json({ error: 'store not available' });
    await claw.store.kvDelete(req.params.key);
    res.json({ ok: true });
  }));

  // ── Filesystem ────────────────────────────────────────────────────

  r.get('/api/agent/:id/fs/read', wrap(async (req, res) => {
    const claw = _agents.get(req.params.id);
    if (!claw) return res.status(404).json({ error: 'agent not found' });
    if (!claw.fs) return res.status(501).json({ error: 'filesystem not available' });
    const { path } = req.query;
    if (!path) return res.status(400).json({ error: 'path required' });
    res.json({ path, content: await claw.fs.read(path) });
  }));

  r.post('/api/agent/:id/fs/write', wrap(async (req, res) => {
    const claw = _agents.get(req.params.id);
    if (!claw) return res.status(404).json({ error: 'agent not found' });
    if (!claw.fs) return res.status(501).json({ error: 'filesystem not available' });
    const { path, content } = req.body;
    if (!path) return res.status(400).json({ error: 'path required' });
    await claw.fs.write(path, content);
    res.json({ ok: true });
  }));

  r.get('/api/agent/:id/fs/ls', wrap(async (req, res) => {
    const claw = _agents.get(req.params.id);
    if (!claw) return res.status(404).json({ error: 'agent not found' });
    if (!claw.fs) return res.status(501).json({ error: 'filesystem not available' });
    res.json(await claw.fs.ls(req.query.path || '/'));
  }));

  r.get('/api/agent/:id/fs/tree', wrap(async (req, res) => {
    const claw = _agents.get(req.params.id);
    if (!claw) return res.status(404).json({ error: 'agent not found' });
    if (!claw.fs) return res.status(501).json({ error: 'filesystem not available' });
    res.json(await claw.fs.tree(req.query.path || '/'));
  }));

  r.post('/api/agent/:id/fs/grep', wrap(async (req, res) => {
    const claw = _agents.get(req.params.id);
    if (!claw) return res.status(404).json({ error: 'agent not found' });
    if (!claw.fs) return res.status(501).json({ error: 'filesystem not available' });
    const { pattern, options } = req.body;
    if (!pattern) return res.status(400).json({ error: 'pattern required' });
    res.json(await claw.fs.grep(pattern, options));
  }));

  r.delete('/api/agent/:id/fs/delete', wrap(async (req, res) => {
    const claw = _agents.get(req.params.id);
    if (!claw) return res.status(404).json({ error: 'agent not found' });
    if (!claw.fs) return res.status(501).json({ error: 'filesystem not available' });
    const { path } = req.query;
    if (!path) return res.status(400).json({ error: 'path required' });
    await claw.fs.delete(path);
    res.json({ ok: true });
  }));

  // ── Shell ─────────────────────────────────────────────────────────

  r.post('/api/agent/:id/shell/exec', wrap(async (req, res) => {
    const claw = _agents.get(req.params.id);
    if (!claw) return res.status(404).json({ error: 'agent not found' });
    if (!claw.shell) return res.status(501).json({ error: 'shell not available' });
    const { command } = req.body;
    if (!command) return res.status(400).json({ error: 'command required' });
    res.json(await claw.shell.exec(command));
  }));

  // ── Act ───────────────────────────────────────────────────────────

  r.post('/api/agent/:id/act/decide', wrap(async (req, res) => {
    const claw = _agents.get(req.params.id);
    if (!claw) return res.status(404).json({ error: 'agent not found' });
    if (!claw.act) return res.status(501).json({ error: 'act not available' });
    const { input, actions } = req.body;
    if (!input) return res.status(400).json({ error: 'input required' });
    res.json(await claw.act.decide(input, { actions }));
  }));

  r.post('/api/agent/:id/act/run', wrap(async (req, res) => {
    const claw = _agents.get(req.params.id);
    if (!claw) return res.status(404).json({ error: 'agent not found' });
    if (!claw.act) return res.status(501).json({ error: 'act not available' });
    const { input, actions } = req.body;
    if (!input) return res.status(400).json({ error: 'input required' });
    res.json(await claw.act.run(input, { actions }));
  }));

  // ── Render ────────────────────────────────────────────────────────

  r.post('/api/agent/:id/render', wrap(async (req, res) => {
    const claw = _agents.get(req.params.id);
    if (!claw) return res.status(404).json({ error: 'agent not found' });
    if (!claw.render) return res.status(501).json({ error: 'render not available' });
    const { markdown, theme } = req.body;
    if (!markdown) return res.status(400).json({ error: 'markdown required' });
    res.json({ html: claw.render.html(markdown, { theme }) });
  }));

  r.get('/api/agent/:id/render/css', wrap(async (req, res) => {
    const claw = _agents.get(req.params.id);
    if (!claw) return res.status(404).json({ error: 'agent not found' });
    if (!claw.render) return res.status(501).json({ error: 'render not available' });
    res.type('text/css').send(claw.render.css(req.query.theme));
  }));

  // ── Sense ─────────────────────────────────────────────────────────

  r.post('/api/agent/:id/sense/frame', lazyUploadSingle('video'), wrap(async (req, res) => {
    const claw = _agents.get(req.params.id);
    if (!claw) return res.status(404).json({ error: 'agent not found' });
    if (!claw.sense) return res.status(501).json({ error: 'sense not available' });
    if (!req.file) return res.status(400).json({ error: 'video file required' });
    const frame = await claw.sense.extractFrame(req.file.buffer, { timestamp: parseFloat(req.body.timestamp) || 0 });
    res.type('image/jpeg').send(frame);
  }));

  // ── Spatial ───────────────────────────────────────────────────────

  r.post('/api/agent/:id/spatial/reconstruct', lazyUploadArray('images', 20), wrap(async (req, res) => {
    const claw = _agents.get(req.params.id);
    if (!claw) return res.status(404).json({ error: 'agent not found' });
    if (!claw.spatial) return res.status(501).json({ error: 'spatial not available' });
    const images = req.files.map(f => f.buffer);
    res.json(await claw.spatial.reconstruct({ images }));
  }));

  // ── Embed ─────────────────────────────────────────────────────────

  r.post('/api/agent/:id/embed/chunk', wrap(async (req, res) => {
    const claw = _agents.get(req.params.id);
    if (!claw) return res.status(404).json({ error: 'agent not found' });
    if (!claw.embed) return res.status(501).json({ error: 'embed not available' });
    const { text, options } = req.body;
    if (!text) return res.status(400).json({ error: 'text required' });
    res.json(claw.embed.chunkText(text, options));
  }));

  // ── Voice ─────────────────────────────────────────────────────────

  r.post('/api/agent/:id/voice/speak', wrap(async (req, res) => {
    const claw = _agents.get(req.params.id);
    if (!claw) return res.status(404).json({ error: 'agent not found' });
    if (!claw.voice) return res.status(501).json({ error: 'voice not available' });
    const { text, voice, model } = req.body;
    if (!text) return res.status(400).json({ error: 'text required' });
    const tts = claw.voice.createTTS({ voice, model });
    const audio = await tts.speak(text);
    res.type('audio/mp3').send(audio);
  }));

  // ═══════════════════════════════════════════════════════════════════
  // Capabilities discovery (no agent needed)
  // ═══════════════════════════════════════════════════════════════════

  r.get('/api/capabilities', wrap(async (_req, res) => {
    const m = await getClaw();
    if (!m) return res.json({ claw: false });
    // Create a temporary claw just to check capabilities
    // (capabilities() only does require() checks, no side effects)
    try {
      const tmp = m.createClaw({ apiKey: 'probe' });
      const caps = tmp.capabilities();
      tmp.destroy();
      res.json(caps);
    } catch {
      res.json({ claw: true, note: 'capabilities check requires agentic-core + agentic-memory' });
    }
  }));
}
