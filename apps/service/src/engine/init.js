/**
 * Engine Init — 启动时自动发现并注册所有引擎
 */

import { register } from './registry.js';
import ollama from './ollama.js';
import whisper from './whisper.js';
import tts from './tts.js';
import { createCloudEngine } from './cloud.js';
import { getConfig } from '../config.js';
import { startHealthCheck } from './health.js';

export async function initEngines() {
  // 1. 本地引擎 — 始终注册，status() 会检测可用性
  register('ollama', ollama);
  register('whisper', whisper);
  register('tts', tts);

  // 2. 云端引擎 — 从配置中读取已配置的 provider
  const config = await getConfig();
  const providers = config.providers || {};

  for (const [id, providerConfig] of Object.entries(providers)) {
    if (providerConfig.apiKey) {
      register(`cloud:${id}`, createCloudEngine(id, providerConfig));
    }
  }

  // 也检查旧格式的 modelPool 里的云端模型
  const pool = config.modelPool || [];
  const seenProviders = new Set(Object.keys(providers));

  for (const m of pool) {
    if (m.provider && m.provider !== 'ollama' && m.apiKey && !seenProviders.has(m.provider)) {
      register(`cloud:${m.provider}`, createCloudEngine(m.provider, {
        apiKey: m.apiKey,
        baseUrl: m.baseUrl,
        models: [{ name: m.name, capabilities: m.capabilities || ['chat'] }],
      }));
      seenProviders.add(m.provider);
    }
  }

  const engineIds = ['ollama', 'whisper', 'tts', ...[...seenProviders].map(p => `cloud:${p}`)];
  console.log(`[engines] registered: ${engineIds.join(', ')}`);
  startHealthCheck();
}
