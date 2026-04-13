/**
 * Extended API routes — lightweight additions to the core API.
 *
 * Sub-libraries (store/fs/shell/act/render/sense/spatial/embed) are
 * accessed directly via `import` or through agentic-claw, not via HTTP.
 * Service only exposes what agentic-client needs: chat, voice, embed, models.
 */

function wrap(fn) {
  return async (req, res) => {
    try { await fn(req, res); } catch (e) {
      console.error(`[api-ext] ${req.method} ${req.path}:`, e.message);
      if (!res.headersSent) res.status(500).json({ error: e.message });
    }
  };
}

export function addExtendedRoutes(r) {
  // Capabilities discovery — what this service instance supports
  r.get('/api/capabilities', wrap(async (_req, res) => {
    let clawCaps = null;
    try {
      const m = await import('agentic-claw');
      const tmp = m.createClaw({ apiKey: 'probe' });
      clawCaps = tmp.capabilities();
      tmp.destroy();
    } catch {}

    res.json({
      // Service-level capabilities (always available via HTTP)
      chat: true,
      voice: true,
      embeddings: true,
      models: true,
      // Sub-library availability (for direct import, not HTTP)
      libraries: clawCaps,
    });
  }));
}
