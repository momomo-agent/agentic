<template>
  <div class="storyteller-panel">
    <div class="story-controls">
      <input v-model="storyTopic" @keydown.enter="runStory" placeholder="输入故事主题或关键词..." :disabled="storyLoading" />
      <button @click="runStory" :disabled="!storyTopic.trim() || storyLoading">
        {{ storyLoading ? '创作中...' : '📖 生成故事' }}
      </button>
    </div>
    <div class="story-result" v-if="storyText">
      <div class="result-label">故事</div>
      <div class="result-text" style="white-space: pre-wrap;">{{ storyText }}</div>
      <div class="story-audio-row" v-if="storyDone">
        <button @click="playStory" :disabled="storyTtsLoading" class="btn-primary">
          {{ storyTtsLoading ? '合成中...' : '🔊 朗读故事' }}
        </button>
        <audio v-if="storyAudioUrl" :src="storyAudioUrl" controls autoplay class="tts-audio"></audio>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ai } from './utils.js'

const props = defineProps({ markTested: Function })
defineEmits(['back'])

const storyTopic = ref('')
const storyText = ref('')
const storyLoading = ref(false)
const storyDone = ref(false)
const storyTtsLoading = ref(false)
const storyAudioUrl = ref(null)

async function runStory() {
  if (!storyTopic.value.trim() || storyLoading.value) return
  storyLoading.value = true
  storyDone.value = false
  storyText.value = ''
  storyAudioUrl.value = null

  try {
    for await (const chunk of ai.think(`请根据以下主题写一个有趣的短故事（300-500字）：${storyTopic.value}`, { stream: true })) {
      if (chunk.type === 'text_delta') storyText.value += chunk.text || ''
    }
    storyDone.value = true
    props.markTested?.('storyteller')
  } catch (e) {
    storyText.value = `错误: ${e.message}`
  }
  storyLoading.value = false
}

async function playStory() {
  if (!storyText.value || storyTtsLoading.value) return
  storyTtsLoading.value = true
  try {
    const audioBuffer = await ai.speak(storyText.value)
    const blob = new Blob([audioBuffer], { type: 'audio/wav' })
    if (storyAudioUrl.value) URL.revokeObjectURL(storyAudioUrl.value)
    storyAudioUrl.value = URL.createObjectURL(blob)
  } catch {}
  storyTtsLoading.value = false
}
</script>

<style scoped>
@import './_shared.css';
.storyteller-panel { display: flex; flex-direction: column; gap: 16px; }
.story-controls { display: flex; gap: 8px; }
.story-controls input { flex: 1; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border, #334155); background: var(--surface-2, #1e293b); color: var(--text); font-size: 14px; }
.story-controls button { padding: 10px 20px; border-radius: 8px; border: none; background: var(--accent, #3b82f6); color: white; cursor: pointer; font-size: 14px; }
.story-controls button:disabled { opacity: 0.5; cursor: not-allowed; }
.story-result { display: flex; flex-direction: column; gap: 12px; }
.story-audio-row { display: flex; align-items: center; gap: 12px; margin-top: 8px; }
.tts-audio { flex: 1; }
</style>
