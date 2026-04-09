<template>
  <div class="config-view">
    <h1 class="page-title">配置</h1>

    <div class="card">
      <div class="card-title">🧠 LLM</div>
      <form @submit.prevent="save" class="config-form">
        <div class="field">
          <label>Provider</label>
          <select v-model="config.llm.provider">
            <option value="ollama">Ollama (本地)</option>
            <option value="openai">OpenAI (云端)</option>
            <option value="anthropic">Anthropic (云端)</option>
          </select>
        </div>
        <div class="field">
          <label>Model</label>
          <input v-model="config.llm.model" :placeholder="config.llm.provider === 'ollama' ? 'gemma4:e4b' : config.llm.provider === 'openai' ? 'gpt-4o-mini' : 'claude-sonnet-4-20250514'" />
        </div>
        <div class="field" v-if="config.llm.provider !== 'ollama'">
          <label>API Key</label>
          <input v-model="config.llm.apiKey" type="password" placeholder="sk-..." />
        </div>
        <div class="field" v-if="config.llm.provider !== 'ollama'">
          <label>Base URL <span class="hint">(可选)</span></label>
          <input v-model="config.llm.baseUrl" placeholder="https://api.openai.com/v1" />
        </div>
        <div class="field">
          <label>Fallback Provider <span class="hint">(可选，本地失败时回退)</span></label>
          <select v-model="config.fallback.provider">
            <option value="">不回退</option>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
          </select>
        </div>
        <div class="field" v-if="config.fallback.provider">
          <label>Fallback Model</label>
          <input v-model="config.fallback.model" :placeholder="config.fallback.provider === 'openai' ? 'gpt-4o-mini' : 'claude-sonnet-4-20250514'" />
        </div>
        <div class="field" v-if="config.fallback.provider">
          <label>Fallback API Key</label>
          <input v-model="config.fallback.apiKey" type="password" placeholder="sk-..." />
        </div>
      </form>
    </div>

    <div class="card">
      <div class="card-title">🎙 STT (语音转文字)</div>
      <form @submit.prevent="save" class="config-form">
        <div class="field">
          <label>Provider</label>
          <select v-model="config.stt.provider">
            <option value="whisper">Whisper (本地)</option>
            <option value="sensevoice">SenseVoice (本地)</option>
            <option value="openai-whisper">OpenAI Whisper (云端)</option>
            <option value="deepgram">Deepgram (云端)</option>
          </select>
        </div>
        <div class="field" v-if="config.stt.provider !== 'whisper' && config.stt.provider !== 'sensevoice'">
          <label>API Key</label>
          <input v-model="config.stt.apiKey" type="password" placeholder="API Key" />
        </div>
      </form>
    </div>

    <div class="card">
      <div class="card-title">🔊 TTS (文字转语音)</div>
      <form @submit.prevent="save" class="config-form">
        <div class="field">
          <label>Provider</label>
          <select v-model="config.tts.provider">
            <option value="kokoro">Kokoro (本地)</option>
            <option value="piper">Piper (本地)</option>
            <option value="coqui">Coqui (本地)</option>
            <option value="macos-say">macOS Say (本地)</option>
            <option value="openai">OpenAI TTS (云端)</option>
            <option value="elevenlabs">ElevenLabs (云端)</option>
          </select>
        </div>
        <div class="field" v-if="config.tts.provider === 'openai' || config.tts.provider === 'elevenlabs'">
          <label>API Key</label>
          <input v-model="config.tts.apiKey" type="password" :placeholder="config.tts.provider === 'openai' ? 'sk-...' : 'xi-...'" />
        </div>
        <div class="field" v-if="config.tts.provider === 'elevenlabs'">
          <label>Voice ID <span class="hint">(可选)</span></label>
          <input v-model="config.tts.voiceId" placeholder="JBFqnCBsd6RMkjVDRZzb (George)" />
        </div>
        <div class="field" v-if="config.tts.provider === 'macos-say'">
          <label>Voice</label>
          <select v-model="config.tts.voice">
            <option value="Samantha">Samantha</option>
            <option value="Alex">Alex</option>
            <option value="Daniel">Daniel</option>
            <option value="Karen">Karen</option>
            <option value="Moira">Moira</option>
            <option value="Tessa">Tessa</option>
            <option value="Tingting">Tingting (中文)</option>
          </select>
        </div>
        <div class="field" v-if="config.tts.provider === 'openai'">
          <label>Voice <span class="hint">(可选)</span></label>
          <select v-model="config.tts.voice">
            <option value="alloy">Alloy</option>
            <option value="echo">Echo</option>
            <option value="fable">Fable</option>
            <option value="onyx">Onyx</option>
            <option value="nova">Nova</option>
            <option value="shimmer">Shimmer</option>
          </select>
        </div>
        <div class="field" v-if="config.tts.provider === 'elevenlabs' || config.tts.provider === 'openai'">
          <label>Base URL <span class="hint">(可选)</span></label>
          <input v-model="config.tts.baseUrl" :placeholder="config.tts.provider === 'elevenlabs' ? 'https://api.elevenlabs.io/v1' : ''" />
        </div>
      </form>
    </div>

    <div class="actions">
      <button @click="save" :disabled="saving">{{ saving ? '保存中...' : '💾 保存所有配置' }}</button>
      <span v-if="saved" class="saved-msg">✓ 已保存</span>
      <span v-if="error" class="error-msg">{{ error }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const defaults = () => ({
  llm: { provider: 'ollama', model: '', apiKey: '', baseUrl: '' },
  stt: { provider: 'whisper', apiKey: '' },
  tts: { provider: 'coqui', apiKey: '', voiceId: '', voice: 'Samantha', baseUrl: '' },
  fallback: { provider: '', model: '', apiKey: '' },
})

const config = ref(defaults())
const loading = ref(true)
const saving = ref(false)
const saved = ref(false)
const error = ref(null)

onMounted(async () => {
  try {
    const data = await fetch('/api/config').then(r => r.json())
    const d = defaults()
    config.value = {
      llm: { ...d.llm, ...data.llm },
      stt: { ...d.stt, ...data.stt },
      tts: { ...d.tts, ...data.tts },
      fallback: { ...d.fallback, ...data.fallback },
    }
  } catch (e) { error.value = e.message }
  finally { loading.value = false }
})

async function save() {
  saving.value = true
  error.value = null
  try {
    // Clean empty strings to avoid overriding defaults
    const clean = JSON.parse(JSON.stringify(config.value))
    for (const section of Object.values(clean)) {
      for (const [k, v] of Object.entries(section)) {
        if (v === '') delete section[k]
      }
    }
    if (!clean.fallback?.provider) delete clean.fallback
    await fetch('/api/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(clean) })
    saved.value = true
    setTimeout(() => saved.value = false, 2000)
  } catch (e) { error.value = e.message }
  finally { saving.value = false }
}
</script>

<style scoped>
.page-title { font-size: 28px; font-weight: 700; margin-bottom: 24px; }
.card { margin-bottom: 24px; padding: 20px; border-radius: 10px; background: var(--surface-2); border: 1px solid var(--border); }
.card-title { font-size: 16px; font-weight: 600; margin-bottom: 16px; }
.config-form { display: flex; flex-direction: column; gap: 16px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 13px; color: var(--text-dim); font-weight: 500; }
.field input, .field select {
  padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border);
  background: var(--surface); font-size: 14px; color: var(--text);
}
.field input::placeholder { color: var(--text-dim); opacity: 0.5; }
.hint { font-weight: 400; opacity: 0.6; }
.actions { display: flex; align-items: center; gap: 16px; padding-top: 8px; }
.actions button {
  padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;
  background: var(--primary, #0075de); color: #fff; border: none; cursor: pointer;
}
.actions button:disabled { opacity: 0.5; cursor: not-allowed; }
.saved-msg { color: var(--success, #10b981); font-size: 14px; }
.error-msg { color: var(--error, #ef4444); font-size: 14px; }
</style>
