<template></template>

<script setup>
import { onMounted, onUnmounted, watch } from 'vue';

const props = defineProps({ wakeWord: String });
const emit = defineEmits(['activated']);

let recognition = null;
let retries = 0;

function startListening() {
  if (!props.wakeWord) return;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { console.warn('SpeechRecognition not supported'); return; }

  recognition = new SR();
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (transcript.toLowerCase().includes(props.wakeWord.toLowerCase())) {
        emit('activated');
      }
    }
  };

  recognition.onerror = () => {
    if (retries < 3) { retries++; recognition.start(); }
  };

  recognition.start();
}

function stopListening() {
  recognition?.stop();
  recognition = null;
}

onMounted(startListening);
onUnmounted(stopListening);

watch(() => props.wakeWord, (val) => {
  stopListening();
  retries = 0;
  if (val) startListening();
});
</script>
