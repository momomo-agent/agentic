<template>
  <div class="config-view">
    <h1 class="page-title">配置</h1>

    <!-- 🧠 对话 Chat -->
    <div class="card">
      <div class="card-title">🧠 对话 (Chat)</div>
      <div class="config-form">
        <div class="field">
          <label>Provider</label>
          <select v-model="chatProvider">
            <option value="ollama">Ollama (本地)</option>
            <option value="cloud">云端</option>
          </select>
        </div>
        <div class="field" v-if="chatProvider === 'ollama'">
          <label>模型</label>
          <select v-model="chatModel">
            <option v-for="m in ollamaModels" :key="m" :value="m">{{ m }}</option>
          </select>
        </div>
        <div class="field" v-else>
          <label>模型 <span class="hint">(如 gpt-4o, claude-sonnet-4-20250514)</span></label>
          <input v-model="chatModel" placeholder="gpt-4o-mini" />
        </div>
        <div class="field" v-if="chatProvider === 'cloud'">
          <label>API Key</label>
          <input v-model="chatApiKey" type="text" placeholder="sk-..." />
        </div>
        <div class="field" v-if="chatProvider === 'cloud'">
          <label>Base URL <span class="hint">(默认 OpenAI)</span></label>
          <input v-model="chatBaseUrl" placeholder="https://api.openai.com/v1" />
        </div>
      </div>
    </div>

    <!-- 🔄 回退 Fallback -->
    <div class="card">
      <div class="card-title">🔄 回退 (Fallback) <span class="hint">主模型失败时使用</span></div>
      <div class="config-form">
        <div class="field">
          <label>Provider</label>
          <select v-model="fbProvider">
            <option value="">不回退</option>
            <option value="ollama">Ollama (本地)</option>
            <option value="cloud">云端</option>
          </select>
        </div>
        <div class="field" v-if="fbProvider === 'ollama'">
          <label>模型</label>
          <select v-model="fbModel">
            <option v-for="m in ollamaModels" :key="m" :value="m">{{ m }}</option>
          </select>
        </div>
        <div class="field" v-if="fbProvider === 'cloud'">
          <label>模型</label>
          <input v-model="fbModel" placeholder="gpt-4o-mini" />
        </div>
        <div class="field" v-if="fbProvider === 'cloud'">
          <label>API Key <span class="hint">(留空则复用对话的 Key)</span></label>
          <input v-model="fbApiKey" type="text" placeholder="留空复用" />
        </div>
        <div class="field" v-if="fbProvider === 'cloud'">
          <label>Base URL</label>
          <input v-model="fbBaseUrl" placeholder="留空复用" />
        </div>
      </div>
    </div>

    <!-- 👁️ 视觉 Vision -->
    <div class="card">
      <div class="card-title">👁️ 视觉 (Vision)</div>
      <div class="config-form">
        <div class="field">
          <label>Provider</label>
          <select v-model="visProvider">
            <option value="ollama">Ollama (本地)</option>
            <option value="cloud">云端</option>
          </select>
        </div>
        <div class="field" v-if="visProvider === 'ollama'">
          <label>模型 <span class="hint">(需支持视觉)</span></label>
          <select v-model="visModel">
            <option v-for="m in ollamaModels" :key="m" :value="m">{{ m }}</option>
          </select>
        </div>
        <div class="field" v-else>
          <label>模型</label>
          <input v-model="visModel" placeholder="gpt-4o" />
        </div>
        <div class="field" v-if="visProvider === 'cloud'">
          <label>API Key <span class="hint">(留空则复用对话的 Key)</span></label>
          <input v-model="visApiKey" type="text" placeholder="留空复用" />
        </div>
        <div class="field" v-if="visProvider === 'cloud'">
          <label>Base URL</label>
          <input v-model="visBaseUrl" placeholder="留空复用" />
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
            <option value="openai-whisper">OpenAI Whisper (云端)</option>
            <option value="deepgram">Deepgram (云端)</option>
          </select>
        </div>
        <div class="field" v-if="sttEngine === 'deepgram'">
          <label>API Key</label>
          <input v-model="sttApiKey" type="text" placeholder="Deepgram API Key" />
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
            <option value="kokoro">Kokoro (本地)</option>
            <option value="macos-say">macOS Say (本地)</option>
            <option value="openai">OpenAI TTS (云端)</option>
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
          <input v-model="ttsApiKey" type="text" placeholder="ElevenLabs API Key" />
        </div>
        <div class="field" v-if="ttsEngine === 'elevenlabs'">
          <label>Voice ID</label>
          <input v-model="ttsVoiceId" placeholder="Voice ID" />
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="actions">
      <button @click="save" :disabled="saving">{{ saving ? '保存中...' : '💾 保存' }}</button>
      <span v-if="saved" class="saved-msg">✓ 已保存</span>
      <span v-if="error" class="error-msg">{{ error }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

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

const chatProvider = ref('ollama')
const chatModel = ref('')
const chatApiKey = ref('')
const chatBaseUrl = ref('')

const fbProvider = ref('')
const fbModel = ref('')
const fbApiKey = ref('')
const fbBaseUrl = ref('')

const visProvider = ref('ollama')
const visModel = ref('')
const visApiKey = ref('')
const visBaseUrl = ref('')

const sttEngine = ref('whisper')
const sttApiKey = ref('')

const ttsEngine = ref('kokoro')
const ttsVoice = ref('Samantha')
const ttsApiKey = ref('')
const ttsVoiceId = ref('')

const saving = ref(false)
const saved = ref(false)
const error = ref(null)

// --- load ---
onMounted(async () => {
  try {
    const [configData, statusData] = await Promise.all([
      fetch('/api/config').then(r => r.json()),
      fetch('/api/status').then(r => r.json()),
    ])

    ollamaModels.value = statusData?.ollama?.models || []

    // Chat
    const llm = configData?.llm || {}
    chatProvider.value = llm.provider === 'ollama' ? 'ollama' : (llm.provider ? 'cloud' : 'ollama')
    chatModel.value = llm.model || ''
    chatApiKey.value = llm.apiKey || ''
    chatBaseUrl.value = llm.baseUrl || ''

    // Fallback
    const fb = configData?.fallback || {}
    if (fb.provider) {
      fbProvider.value = fb.provider === 'ollama' ? 'ollama' : 'cloud'
      fbModel.value = fb.model || ''
      fbApiKey.value = fb.apiKey || ''
      fbBaseUrl.value = fb.baseUrl || ''
    }

    // Vision
    const vis = configData?.vision || {}
    if (vis.provider) {
      visProvider.value = vis.provider === 'ollama' ? 'ollama' : 'cloud'
      visModel.value = vis.model || ''
      visApiKey.value = vis.apiKey || ''
      visBaseUrl.value = vis.baseUrl || ''
    }

    // STT
    const stt = configData?.stt || {}
    sttEngine.value = stt.provider || 'whisper'
    sttApiKey.value = stt.apiKey || ''

    // TTS
    const tts = configData?.tts || {}
    ttsEngine.value = tts.provider || 'kokoro'
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
    const payload = {
      llm: {
        provider: chatProvider.value === 'ollama' ? 'ollama' : chatModel.value.split('/')[0]?.trim() || 'openai',
        model: chatModel.value,
      },
      stt: { provider: sttEngine.value },
      tts: { provider: ttsEngine.value },
    }

    // For cloud chat, store apiKey/baseUrl in llm
    if (chatProvider.value === 'cloud') {
      payload.llm.provider = 'cloud'
      if (chatApiKey.value) payload.llm.apiKey = chatApiKey.value
      if (chatBaseUrl.value) payload.llm.baseUrl = chatBaseUrl.value
    }

    // Fallback
    if (fbProvider.value) {
      payload.fallback = { provider: fbProvider.value === 'ollama' ? 'ollama' : 'cloud', model: fbModel.value }
      if (fbProvider.value === 'cloud') {
        if (fbApiKey.value) payload.fallback.apiKey = fbApiKey.value
        if (fbBaseUrl.value) payload.fallback.baseUrl = fbBaseUrl.value
      }
    } else {
      payload.fallback = { provider: '' }
    }

    // Vision
    payload.vision = { provider: visProvider.value === 'ollama' ? 'ollama' : 'cloud', model: visModel.value }
    if (visProvider.value === 'cloud') {
      if (visApiKey.value) payload.vision.apiKey = visApiKey.value
      if (visBaseUrl.value) payload.vision.baseUrl = visBaseUrl.value
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
.hint { font-weight: 400; opacity: 0.6; font-size: 12px; }
.actions { display: flex; align-items: center; gap: 16px; padding-top: 8px; }
.actions button {
  padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;
  background: var(--primary, #0075de); color: #fff; border: none; cursor: pointer;
}
.actions button:disabled { opacity: 0.5; cursor: not-allowed; }
.saved-msg { color: var(--success, #10b981); font-size: 14px; }
.error-msg { color: var(--error, #ef4444); font-size: 14px; }
</style>
