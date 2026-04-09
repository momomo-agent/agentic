<template>
  <div class="config-view">
    <h1 class="page-title">配置</h1>

    <!-- 🧠 对话 Chat -->
    <div class="card">
      <div class="card-title">🧠 对话 (Chat)</div>
      <div class="config-form">
        <div class="field">
          <label>模型</label>
          <select v-model="chatModel">
            <optgroup label="本地模型">
              <option v-for="m in ollamaModels" :key="'ollama/'+m" :value="'ollama / '+m">ollama / {{ m }}</option>
            </optgroup>
            <optgroup v-if="enabledCloud('openai')" label="OpenAI">
              <option v-for="m in cloudModels.openai" :key="'openai/'+m" :value="'openai / '+m">openai / {{ m }}</option>
            </optgroup>
            <optgroup v-if="enabledCloud('anthropic')" label="Anthropic">
              <option v-for="m in cloudModels.anthropic" :key="'anthropic/'+m" :value="'anthropic / '+m">anthropic / {{ m }}</option>
            </optgroup>
            <optgroup v-if="enabledCloud('google')" label="Google">
              <option v-for="m in cloudModels.google" :key="'google/'+m" :value="'google / '+m">google / {{ m }}</option>
            </optgroup>
            <optgroup v-if="enabledCloud('groq')" label="Groq">
              <option v-for="m in cloudModels.groq" :key="'groq/'+m" :value="'groq / '+m">groq / {{ m }}</option>
            </optgroup>
          </select>
        </div>
        <div class="field">
          <label>回退模型 <span class="hint">(可选)</span></label>
          <select v-model="chatFallback">
            <option value="">不回退</option>
            <optgroup label="本地模型">
              <option v-for="m in ollamaModels" :key="'fb-ollama/'+m" :value="'ollama / '+m">ollama / {{ m }}</option>
            </optgroup>
            <optgroup v-if="enabledCloud('openai')" label="OpenAI">
              <option v-for="m in cloudModels.openai" :key="'fb-openai/'+m" :value="'openai / '+m">openai / {{ m }}</option>
            </optgroup>
            <optgroup v-if="enabledCloud('anthropic')" label="Anthropic">
              <option v-for="m in cloudModels.anthropic" :key="'fb-anthropic/'+m" :value="'anthropic / '+m">anthropic / {{ m }}</option>
            </optgroup>
            <optgroup v-if="enabledCloud('google')" label="Google">
              <option v-for="m in cloudModels.google" :key="'fb-google/'+m" :value="'google / '+m">google / {{ m }}</option>
            </optgroup>
            <optgroup v-if="enabledCloud('groq')" label="Groq">
              <option v-for="m in cloudModels.groq" :key="'fb-groq/'+m" :value="'groq / '+m">groq / {{ m }}</option>
            </optgroup>
          </select>
        </div>
      </div>
    </div>

    <!-- 👁️ 视觉 Vision -->
    <div class="card">
      <div class="card-title">👁️ 视觉 (Vision)</div>
      <div class="config-form">
        <div class="field">
          <label>模型</label>
          <select v-model="visionModel">
            <optgroup label="本地模型">
              <option v-for="m in visionLocalModels" :key="'v-ollama/'+m" :value="'ollama / '+m">ollama / {{ m }}</option>
            </optgroup>
            <optgroup v-if="visionCloudOptions.length" label="云端模型">
              <option v-for="o in visionCloudOptions" :key="'v-'+o.value" :value="o.value">{{ o.value }}</option>
            </optgroup>
          </select>
        </div>
      </div>
    </div>

    <!-- 🎙 语音识别 STT -->
    <div class="card">
      <div class="card-title">🎙 语音识别 (STT)</div>
      <div class="config-form">
        <div class="field">
          <label>引擎</label>
          <select v-model="sttEngine">
            <option value="whisper">Whisper (本地)</option>
            <option value="sensevoice">SenseVoice (本地)</option>
            <option v-if="enabledCloud('openai')" value="openai-whisper">OpenAI Whisper (云端)</option>
            <option value="deepgram">Deepgram (云端)</option>
          </select>
        </div>
        <div class="field" v-if="sttEngine === 'deepgram'">
          <label>API Key</label>
          <input v-model="sttApiKey" type="password" placeholder="Deepgram API Key" />
        </div>
      </div>
    </div>

    <!-- 🔊 语音合成 TTS -->
    <div class="card">
      <div class="card-title">🔊 语音合成 (TTS)</div>
      <div class="config-form">
        <div class="field">
          <label>引擎</label>
          <select v-model="ttsEngine">
            <option value="macos-say">macOS Say (本地)</option>
            <option value="kokoro">Kokoro (本地)</option>
            <option value="piper">Piper (本地)</option>
            <option v-if="enabledCloud('openai')" value="openai">OpenAI TTS (云端)</option>
            <option value="elevenlabs">ElevenLabs (云端)</option>
          </select>
        </div>
        <div class="field" v-if="ttsEngine === 'macos-say'">
          <label>声音</label>
          <select v-model="ttsVoice">
            <option v-for="v in macVoices" :key="v.value" :value="v.value">{{ v.label }}</option>
          </select>
        </div>
        <div class="field" v-if="ttsEngine === 'openai'">
          <label>声音</label>
          <select v-model="ttsVoice">
            <option v-for="v in openaiVoices" :key="v" :value="v">{{ v }}</option>
          </select>
        </div>
        <div class="field" v-if="ttsEngine === 'elevenlabs'">
          <label>API Key</label>
          <input v-model="ttsApiKey" type="password" placeholder="xi-..." />
        </div>
        <div class="field" v-if="ttsEngine === 'elevenlabs'">
          <label>Voice ID <span class="hint">(可选)</span></label>
          <input v-model="ttsVoiceId" placeholder="JBFqnCBsd6RMkjVDRZzb" />
        </div>
      </div>
    </div>

    <div class="actions">
      <button @click="save" :disabled="saving">{{ saving ? '保存中...' : '💾 保存配置' }}</button>
      <span v-if="saved" class="saved-msg">✓ 已保存</span>
      <span v-if="error" class="error-msg">{{ error }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

// --- static data ---
const cloudModels = {
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1'],
  anthropic: ['claude-sonnet-4-20250514', 'claude-haiku-35', 'claude-opus-4'],
  google: ['gemini-2.5-flash', 'gemini-2.5-pro'],
  groq: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768'],
}
const visionCapable = {
  local: ['llava:7b', 'moondream', 'gemma4:e4b'],
  cloud: [
    { provider: 'openai', model: 'gpt-4o' },
    { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
    { provider: 'google', model: 'gemini-2.5-flash' },
  ],
}
const macVoices = [
  { value: 'Samantha', label: 'Samantha' },
  { value: 'Alex', label: 'Alex' },
  { value: 'Daniel', label: 'Daniel' },
  { value: 'Karen', label: 'Karen' },
  { value: 'Moira', label: 'Moira' },
  { value: 'Tessa', label: 'Tessa' },
  { value: 'Tingting', label: 'Tingting (中文)' },
]
const openaiVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']

// --- state ---
const ollamaModels = ref([])
const providers = ref({}) // config.providers from /api/config
const chatModel = ref('')
const chatFallback = ref('')
const visionModel = ref('')
const sttEngine = ref('whisper')
const sttApiKey = ref('')
const ttsEngine = ref('macos-say')
const ttsVoice = ref('Samantha')
const ttsApiKey = ref('')
const ttsVoiceId = ref('')
const saving = ref(false)
const saved = ref(false)
const error = ref(null)

// --- helpers ---
function enabledCloud(name) {
  const p = providers.value[name]
  return p && p.enabled
}

function parseSelection(str) {
  if (!str) return { provider: '', model: '' }
  const [provider, model] = str.split(' / ')
  return { provider: provider.trim(), model: model.trim() }
}

function toSelection(provider, model) {
  if (!provider || !model) return ''
  return `${provider} / ${model}`
}

const visionLocalModels = computed(() =>
  visionCapable.local.filter(m => ollamaModels.value.includes(m))
)

const visionCloudOptions = computed(() =>
  visionCapable.cloud
    .filter(c => enabledCloud(c.provider))
    .map(c => ({ value: `${c.provider} / ${c.model}` }))
)

// --- load ---
onMounted(async () => {
  try {
    const [configData, statusData] = await Promise.all([
      fetch('/api/config').then(r => r.json()),
      fetch('/api/status').then(r => r.json()),
    ])

    // ollama models from status
    ollamaModels.value = statusData?.ollama?.models || []

    // providers map
    providers.value = configData?.providers || {}

    // Chat
    const llm = configData?.llm || {}
    chatModel.value = toSelection(llm.provider || 'ollama', llm.model || '')

    const fb = configData?.fallback || {}
    chatFallback.value = fb.provider ? toSelection(fb.provider, fb.model) : ''

    // Vision
    const vis = configData?.vision || {}
    visionModel.value = vis.provider ? toSelection(vis.provider, vis.model) : ''

    // STT
    const stt = configData?.stt || {}
    sttEngine.value = stt.provider || 'whisper'
    sttApiKey.value = stt.apiKey || ''

    // TTS
    const tts = configData?.tts || {}
    ttsEngine.value = tts.provider || 'macos-say'
    ttsVoice.value = tts.voice || 'Samantha'
    ttsApiKey.value = tts.apiKey || ''
    ttsVoiceId.value = tts.voiceId || ''
  } catch (e) {
    error.value = e.message
  }
})

// --- save ---
async function save() {
  saving.value = true
  error.value = null
  try {
    const chat = parseSelection(chatModel.value)
    const fallback = parseSelection(chatFallback.value)
    const vision = parseSelection(visionModel.value)

    const payload = {
      llm: { provider: chat.provider, model: chat.model },
      stt: { provider: sttEngine.value },
      tts: { provider: ttsEngine.value },
    }

    // fallback
    if (fallback.provider) {
      payload.fallback = { provider: fallback.provider, model: fallback.model }
    }

    // vision
    if (vision.provider) {
      payload.vision = { provider: vision.provider, model: vision.model }
    }

    // STT extras
    if (sttEngine.value === 'deepgram' && sttApiKey.value) {
      payload.stt.apiKey = sttApiKey.value
    }

    // TTS extras
    if (ttsEngine.value === 'macos-say' || ttsEngine.value === 'openai') {
      payload.tts.voice = ttsVoice.value
    }
    if (ttsEngine.value === 'elevenlabs') {
      if (ttsApiKey.value) payload.tts.apiKey = ttsApiKey.value
      if (ttsVoiceId.value) payload.tts.voiceId = ttsVoiceId.value
    }

    await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    saved.value = true
    setTimeout(() => (saved.value = false), 2000)
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.page-title { font-size: 28px; font-weight: 700; margin-bottom: 24px; }
.card { margin-bottom: 20px; padding: 20px; border-radius: 10px; background: var(--surface-2); border: 1px solid var(--border); }
.card-title { font-size: 16px; font-weight: 600; margin-bottom: 14px; }
.config-form { display: flex; flex-direction: column; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 13px; color: var(--text-dim); font-weight: 500; }
.field input, .field select {
  padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border);
  background: var(--surface); font-size: 14px; color: var(--text);
}
.field select optgroup { color: var(--text-dim); font-style: normal; }
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
