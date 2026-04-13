/**
 * TTS Engine — text-to-speech
 *
 * 支持多个后端：kokoro, piper, macos-say, elevenlabs, openai-tts
 * 对外统一为 tts 引擎。
 */

const TTS_MODELS = [
  { name: 'kokoro', description: 'Kokoro — 高质量多语言 TTS', capabilities: ['tts'] },
  { name: 'piper', description: 'Piper — 轻量离线 TTS', capabilities: ['tts'] },
  { name: 'macos-say', description: 'macOS Say — 系统内置', capabilities: ['tts'] },
];

export default {
  name: 'TTS',

  async status() {
    // At minimum, macos-say is always available on macOS
    const available = process.platform === 'darwin' || true; // piper/kokoro could be anywhere
    return { available };
  },

  async models() {
    const models = [];

    // macOS say is always available on macOS
    if (process.platform === 'darwin') {
      models.push({ id: 'macos-say', name: 'macos-say', description: 'macOS Say — 系统内置', capabilities: ['tts'], installed: true });
    }

    // Local TTS engines
    models.push({ id: 'kokoro', name: 'kokoro', description: 'Kokoro — 高质量多语言 TTS', capabilities: ['tts'], installed: false });
    models.push({ id: 'piper', name: 'piper', description: 'Piper — 轻量离线 TTS', capabilities: ['tts'], installed: false });

    // Cloud TTS engines
    models.push({ id: 'elevenlabs', name: 'elevenlabs', description: 'ElevenLabs — 云端高质量 TTS', capabilities: ['tts'], installed: true, cloud: true });
    models.push({ id: 'openai', name: 'openai', description: 'OpenAI TTS — 云端语音合成', capabilities: ['tts'], installed: true, cloud: true });

    return models;
  },

  recommended() {
    return TTS_MODELS;
  },

  /**
   * Run TTS synthesis via the specified backend
   * @param {string} modelName - e.g. "kokoro", "macos-say", "piper"
   * @param {object} input - { text: string }
   * @returns {Promise<Buffer>} audio buffer
   */
  async run(modelName, input) {
    const adapterMap = {
      'macos-say': () => import('../runtime/adapters/voice/macos-say.js'),
      piper:       () => import('../runtime/adapters/voice/piper.js'),
      kokoro:      () => import('../runtime/adapters/voice/kokoro.js'),
      elevenlabs:  () => import('../runtime/adapters/voice/elevenlabs.js'),
      openai:      () => import('../runtime/adapters/voice/openai-tts.js'),
    };
    const load = adapterMap[modelName];
    if (!load) throw new Error(`Unknown TTS model: ${modelName}`);
    const mod = await load();
    const adapter = mod.synthesize ? mod : mod.default;
    return adapter.synthesize(input.text);
  },
};
