<template>
  <div class="input-box">
    <textarea
      v-model="text"
      @keydown.enter.exact.prevent="handleSend"
      placeholder="Type your message... (Enter to send)"
      :disabled="disabled"
      rows="1"
      ref="textareaRef"
    />
    <button @click="handleSend" :disabled="disabled || !text.trim()">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({ disabled: { type: Boolean, default: false } });
const emit = defineEmits(['send']);
const text = ref('');
const textareaRef = ref(null);

function handleSend() {
  const message = text.value.trim();
  if (message && !props.disabled) {
    emit('send', message);
    text.value = '';
  }
}

defineExpose({ setText: (v) => { text.value = v; } });

watch(text, () => {
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto';
    textareaRef.value.style.height = textareaRef.value.scrollHeight + 'px';
  }
});
</script>

<style scoped>
.input-box { display: flex; gap: 12px; padding: 20px; border-top: 1px solid #e0e0e0; background: white; }
textarea {
  flex: 1; padding: 12px; border: 1px solid #e0e0e0; border-radius: 8px;
  font-size: 14px; font-family: inherit; resize: none; max-height: 120px; overflow-y: auto;
}
textarea:focus { outline: none; border-color: #667eea; }
textarea:disabled { background: #f5f5f5; cursor: not-allowed; }
button {
  width: 48px; height: 48px; border: none; border-radius: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white; cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: opacity 0.2s;
}
button:hover:not(:disabled) { opacity: 0.9; }
button:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
