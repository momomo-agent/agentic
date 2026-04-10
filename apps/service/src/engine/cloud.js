/**
 * Cloud Engine — 云端 API (OpenAI, Anthropic, etc.)
 *
 * 每个 provider 注册为独立的 cloud engine 实例。
 * 一个 API key 可以提供多种能力 (chat, vision, stt, tts, embedding)。
 */

export function createCloudEngine(provider, config) {
  const { apiKey, baseUrl, models: modelList } = config;

  // Default model lists per provider
  const DEFAULT_MODELS = {
    openai: [
      { name: 'gpt-4o', capabilities: ['chat', 'vision'] },
      { name: 'gpt-4o-mini', capabilities: ['chat', 'vision'] },
      { name: 'gpt-4.1-mini', capabilities: ['chat', 'vision'] },
      { name: 'o4-mini', capabilities: ['chat'] },
      { name: 'whisper-1', capabilities: ['stt'] },
      { name: 'tts-1', capabilities: ['tts'] },
      { name: 'text-embedding-3-small', capabilities: ['embedding'] },
    ],
    anthropic: [
      { name: 'claude-sonnet-4-20250514', capabilities: ['chat', 'vision'] },
      { name: 'claude-haiku-3.5', capabilities: ['chat', 'vision'] },
    ],
    google: [
      { name: 'gemini-2.5-flash', capabilities: ['chat', 'vision'] },
      { name: 'gemini-2.5-pro', capabilities: ['chat', 'vision'] },
    ],
  };

  const knownModels = modelList || DEFAULT_MODELS[provider] || [];

  return {
    name: `Cloud (${provider})`,
    provider,
    apiKey,
    baseUrl,

    async status() {
      return { available: !!apiKey, provider };
    },

    async models() {
      if (!apiKey) return [];
      return knownModels.map(m => ({
        id: `${provider}:${m.name}`,
        name: m.name,
        capabilities: m.capabilities || ['chat'],
        installed: true,
        description: m.description || '',
      }));
    },

    recommended() {
      return knownModels;
    },
  };
}
