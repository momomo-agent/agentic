<template>
  <div class="app">
    <a href="/admin" class="admin-link">Admin</a>
    <button @click="toggleVAD" :title="vadMode ? 'Switch to PTT' : 'Switch to VAD'">
      {{ vadMode ? '🎙️ VAD' : '🎤 PTT' }}
    </button>
    <span v-if="vadError" style="color:red;font-size:12px">{{ vadError }}</span>
    <WakeWord v-if="wakeWord" :wakeWord="wakeWord" @activated="onWakeWord" />
    <ChatBox ref="chatBox" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import ChatBox from './components/ChatBox.vue';
import WakeWord from './components/WakeWord.vue';
import { useVAD } from './composables/useVAD.js';

const wakeWord = ref('');
const chatBox = ref(null);
const vadMode = ref(false);
const vadError = ref('');
let vad = null;

onMounted(async () => {
  try {
    const res = await fetch('/api/config');
    const cfg = await res.json();
    wakeWord.value = cfg.wakeWord || '';
  } catch {}
});

onUnmounted(() => { vad?.stop(); });

function onWakeWord() {
  chatBox.value?.startRecording();
}

async function toggleVAD() {
  if (vadMode.value) {
    vad?.stop();
    vad = null;
    vadMode.value = false;
  } else {
    try {
      vad = useVAD({
        onStart: () => chatBox.value?.startRecording?.(),
        onStop: () => chatBox.value?.stopRecording?.(),
      });
      await vad.start();
      vadMode.value = true;
      vadError.value = '';
    } catch (e) {
      vadError.value = e.name === 'NotAllowedError' ? 'Mic permission denied' : e.message;
    }
  }
}
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #f5f5f5;
}
.app {
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
