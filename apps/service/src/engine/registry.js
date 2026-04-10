/**
 * Engine Registry — 统一模型发现与路由
 *
 * 用户只看到模型，引擎是内部实现。
 * 每个引擎注册自己能提供的模型，registry 汇总成统一 pool。
 * resolveModel("gemma4:e4b") → 自动找到 OllamaEngine 去跑。
 */

const engines = new Map();

/**
 * 注册一个引擎
 * @param {string} id - 引擎 ID (ollama, whisper, kokoro, cloud:openai, ...)
 * @param {object} engine - { name, capabilities, status(), models(), run(model, input), install?() }
 */
export function register(id, engine) {
  engines.set(id, engine);
}

export function unregister(id) {
  engines.delete(id);
}

/**
 * 获取所有引擎
 */
export function getEngines() {
  return [...engines.entries()].map(([id, e]) => ({ id, ...e }));
}

/**
 * 获取单个引擎
 */
export function getEngine(id) {
  return engines.get(id) || null;
}

/**
 * 汇总所有引擎的模型 → 统一 pool
 * 每个模型带 engineId，用户不需要关心
 */
export async function discoverModels() {
  const all = [];
  for (const [engineId, engine] of engines) {
    try {
      const status = await engine.status();
      if (!status.available) continue;
      const models = await engine.models();
      for (const m of models) {
        all.push({
          id: m.id || `${engineId}:${m.name}`,
          name: m.name,
          engineId,
          capabilities: m.capabilities || [],
          size: m.size || null,
          installed: m.installed !== false,
          description: m.description || '',
        });
      }
    } catch (err) {
      console.warn(`[registry] engine ${engineId} discovery failed:`, err.message);
    }
  }
  return all;
}

/**
 * 根据模型 ID 找到对应引擎并返回可执行的 resolved 对象
 * @param {string} modelId - 如 "gemma4:e4b", "whisper:small", "openai:gpt-4o-mini"
 */
export async function resolveModel(modelId) {
  if (!modelId) return null;

  // 先在所有引擎的模型里精确匹配
  for (const [engineId, engine] of engines) {
    try {
      const status = await engine.status();
      if (!status.available) continue;
      const models = await engine.models();
      const match = models.find(m => (m.id || `${engineId}:${m.name}`) === modelId || m.name === modelId);
      if (match) {
        return {
          engineId,
          engine,
          model: match,
          provider: engineId.startsWith('cloud:') ? engineId.split(':')[1] : engineId,
          modelName: match.name,
        };
      }
    } catch { continue; }
  }

  // 兼容旧格式 "ollama:model" / "cloud:provider:model"
  if (modelId.includes(':')) {
    const parts = modelId.split(':');
    if (parts[0] === 'ollama') {
      const engine = engines.get('ollama');
      if (engine) return { engineId: 'ollama', engine, model: { name: parts.slice(1).join(':') }, provider: 'ollama', modelName: parts.slice(1).join(':') };
    }
    if (parts[0] === 'cloud') {
      const providerId = `cloud:${parts[1]}`;
      const engine = engines.get(providerId);
      if (engine) return { engineId: providerId, engine, model: { name: parts.slice(2).join(':') }, provider: parts[1], modelName: parts.slice(2).join(':') };
    }
  }

  return null;
}

/**
 * 按能力筛选可用模型
 */
export async function modelsForCapability(cap) {
  const all = await discoverModels();
  return all.filter(m => m.capabilities.includes(cap));
}
