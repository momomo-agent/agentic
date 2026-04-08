<template>
  <div class="message-list" ref="listRef">
    <div v-for="(msg, i) in messages" :key="i" :class="['message', msg.role]">
      <div class="message-content">{{ msg.content }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';

const props = defineProps({ messages: { type: Array, required: true } });
const listRef = ref(null);

watch(() => props.messages, async () => {
  await nextTick();
  if (listRef.value) listRef.value.scrollTop = listRef.value.scrollHeight;
}, { deep: true });
</script>

<style scoped>
.message-list {
  flex: 1; overflow-y: auto; padding: 20px;
  display: flex; flex-direction: column; gap: 16px;
}
.message { display: flex; }
.message.user { justify-content: flex-end; }
.message.assistant { justify-content: flex-start; }
.message-content {
  max-width: 70%; padding: 12px 16px; border-radius: 12px;
  word-wrap: break-word; white-space: pre-wrap;
}
.message.user .message-content { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
.message.assistant .message-content { background: #f0f0f0; color: #333; }
.message-list::-webkit-scrollbar { width: 6px; }
.message-list::-webkit-scrollbar-track { background: transparent; }
.message-list::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }
</style>
