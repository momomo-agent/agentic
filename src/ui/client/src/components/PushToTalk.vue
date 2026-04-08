<template>
  <div style="display:inline-flex;gap:4px;align-items:center">
    <button
      v-if="!vadMode"
      @mousedown="startRecording" @mouseup="stopRecording"
      @touchstart.prevent="startRecording" @touchend.prevent="stopRecording"
      :class="{ recording }"
    >{{ recording ? '🔴' : '🎤' }}</button>
    <span v-else :class="{ recording }" style="font-size:1.4rem;padding:4px 8px">{{ recording ? '🔴' : '🎤' }}</span>
    <button @click="toggleMode" style="font-size:0.75rem;padding:2px 6px">{{ vadMode ? 'VAD' : 'PTT' }}</button>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useVAD } from '../composables/useVAD.js';

const emit = defineEmits(['transcribed', 'error']);
const recording = ref(false);
const vadMode = ref(true);

defineExpose({ startRecording, stopRecording });
let recorder, chunks, vad;

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunks = [];
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(chunks, { type: 'audio/webm' });
      const form = new FormData();
      form.append('audio', blob, 'audio.webm');
      const res = await fetch('/api/transcribe', { method: 'POST', body: form });
      const { text } = await res.json();
      if (text) emit('transcribed', text);
    };
    recorder.start();
    recording.value = true;
  } catch (e) {
    emit('error', e);
  }
}

function stopRecording() {
  recorder?.stop();
  recording.value = false;
}

async function initVAD() {
  try {
    vad = useVAD(startRecording, stopRecording);
    await vad.start();
  } catch (e) {
    emit('error', e);
    vadMode.value = false;
  }
}

function destroyVAD() {
  vad?.stop();
  vad = null;
}

async function toggleMode() {
  if (vadMode.value) {
    destroyVAD();
    vadMode.value = false;
  } else {
    vadMode.value = true;
    await initVAD();
  }
}

onMounted(() => { if (vadMode.value) initVAD(); });
onUnmounted(() => destroyVAD());
</script>

<style scoped>
button { font-size: 1.4rem; background: none; border: none; cursor: pointer; padding: 4px 8px; }
button.recording, span.recording { opacity: 0.7; }
</style>
