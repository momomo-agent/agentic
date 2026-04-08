<template>
  <div class="chat-box">
    <div class="header"><h1>Agentic Service</h1></div>
    <MessageList :messages="messages" />
    <div class="input-row">
      <InputBox ref="inputBox" @send="handleSend" :disabled="loading" />
      <PushToTalk ref="ptt" @transcribed="onTranscribed" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import MessageList from './MessageList.vue';
import InputBox from './InputBox.vue';
import PushToTalk from './PushToTalk.vue';
import { useWakeWord } from '../composables/useWakeWord.js';

const { setWakeWord, check } = useWakeWord();
const inputBox = ref(null);
const ptt = ref(null);

defineExpose({
  startRecording: () => ptt.value?.start(),
  stopRecording: () => ptt.value?.stop(),
});

onMounted(async () => {
  try {
    const res = await fetch('/api/config');
    const cfg = await res.json();
    if (cfg.wakeWord) setWakeWord(cfg.wakeWord);
  } catch {}
});

function onTranscribed(text) {
  if (check(text)) {
    handleSend(text);
  } else if (inputBox.value?.setText) {
    inputBox.value.setText(text);
  }
}

const messages = ref([]);
const loading = ref(false);

async function handleSend(text) {
  messages.value.push({ role: 'user', content: text });
  loading.value = true;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history: messages.value.slice(0, -1) })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const aiMessage = { role: 'assistant', content: '' };
    messages.value.push(aiMessage);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const line of decoder.decode(value).split('\n')) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          if (data.chunk) aiMessage.content += data.chunk;
          if (data.error) aiMessage.content = `Error: ${data.error}`;
        }
      }
    }
  } catch (error) {
    messages.value.push({ role: 'assistant', content: `Error: ${error.message}` });
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.chat-box {
  width: 90vw; max-width: 800px; height: 90vh; max-height: 700px;
  background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  display: flex; flex-direction: column; overflow: hidden;
}
.header {
  padding: 20px; border-bottom: 1px solid #e0e0e0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;
}
.header h1 { font-size: 20px; font-weight: 600; }
.input-row { display: flex; align-items: flex-end; }
.input-row > :first-child { flex: 1; }
</style>
