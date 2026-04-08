# Task: Web UI 最小版 - Technical Design

## 目标
一个对话框能打字聊天，Vue 3 + Vite。

## 文件清单

### 新建文件
- `src/ui/client/index.html` - HTML 入口
- `src/ui/client/src/main.js` - Vue 应用入口
- `src/ui/client/src/App.vue` - 根组件
- `src/ui/client/src/components/ChatBox.vue` - 聊天界面
- `src/ui/client/src/components/MessageList.vue` - 消息列表
- `src/ui/client/src/components/InputBox.vue` - 输入框
- `src/ui/client/vite.config.js` - Vite 配置
- `src/ui/client/package.json` - 前端依赖

## 组件结构

```
App.vue
└── ChatBox.vue
    ├── MessageList.vue
    └── InputBox.vue
```

## 组件设计

### 1. App.vue (根组件)

```vue
<template>
  <div class="app">
    <ChatBox />
  </div>
</template>

<script setup>
import ChatBox from './components/ChatBox.vue';
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

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
```

### 2. ChatBox.vue (主容器)

```vue
<template>
  <div class="chat-box">
    <div class="header">
      <h1>Agentic Service</h1>
    </div>

    <MessageList :messages="messages" />

    <InputBox
      @send="handleSend"
      :disabled="loading"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import MessageList from './MessageList.vue';
import InputBox from './InputBox.vue';

const messages = ref([]);
const loading = ref(false);

async function handleSend(text) {
  // 添加用户消息
  messages.value.push({
    role: 'user',
    content: text
  });

  loading.value = true;

  try {
    // 调用 API
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        history: messages.value.slice(0, -1) // 不包含当前消息
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    // 创建 AI 消息
    const aiMessage = {
      role: 'assistant',
      content: ''
    };
    messages.value.push(aiMessage);

    // 解析 SSE 流
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));

          if (data.chunk) {
            aiMessage.content += data.chunk;
          }

          if (data.error) {
            aiMessage.content = `Error: ${data.error}`;
          }
        }
      }
    }
  } catch (error) {
    messages.value.push({
      role: 'assistant',
      content: `Error: ${error.message}`
    });
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.chat-box {
  width: 90vw;
  max-width: 800px;
  height: 90vh;
  max-height: 700px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.header h1 {
  font-size: 20px;
  font-weight: 600;
}
</style>
```

### 3. MessageList.vue (消息列表)

```vue
<template>
  <div class="message-list" ref="listRef">
    <div
      v-for="(msg, index) in messages"
      :key="index"
      :class="['message', msg.role]"
    >
      <div class="message-content">
        {{ msg.content }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';

const props = defineProps({
  messages: {
    type: Array,
    required: true
  }
});

const listRef = ref(null);

// 自动滚动到底部
watch(() => props.messages, async () => {
  await nextTick();
  if (listRef.value) {
    listRef.value.scrollTop = listRef.value.scrollHeight;
  }
}, { deep: true });
</script>

<style scoped>
.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message {
  display: flex;
}

.message.user {
  justify-content: flex-end;
}

.message.assistant {
  justify-content: flex-start;
}

.message-content {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 12px;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.message.user .message-content {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.message.assistant .message-content {
  background: #f0f0f0;
  color: #333;
}

/* 滚动条样式 */
.message-list::-webkit-scrollbar {
  width: 6px;
}

.message-list::-webkit-scrollbar-track {
  background: transparent;
}

.message-list::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}

.message-list::-webkit-scrollbar-thumb:hover {
  background: #999;
}
</style>
```

### 4. InputBox.vue (输入框)

```vue
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
    <button
      @click="handleSend"
      :disabled="disabled || !text.trim()"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  disabled: {
    type: Boolean,
    default: false
  }
});

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

// 自动调整高度
watch(text, () => {
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto';
    textareaRef.value.style.height = textareaRef.value.scrollHeight + 'px';
  }
});
</script>

<style scoped>
.input-box {
  display: flex;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #e0e0e0;
  background: white;
}

textarea {
  flex: 1;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  resize: none;
  max-height: 120px;
  overflow-y: auto;
}

textarea:focus {
  outline: none;
  border-color: #667eea;
}

textarea:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

button {
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;
}

button:hover:not(:disabled) {
  opacity: 0.9;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
```

## 配置文件

### vite.config.js

```javascript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: '../../../dist/ui',
    emptyOutDir: true
  }
});
```

### package.json

```json
{
  "name": "agentic-service-ui",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.4.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

### index.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Agentic Service</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

### main.js

```javascript
import { createApp } from 'vue';
import App from './App.vue';

createApp(App).mount('#app');
```

## 功能特性

1. **流式显示**: AI 回复逐字显示
2. **自动滚动**: 新消息自动滚动到底部
3. **Enter 发送**: 按 Enter 发送，Shift+Enter 换行
4. **禁用状态**: 加载时禁用输入
5. **响应式**: 支持移动端和桌面端
6. **错误处理**: 显示错误消息

## 边界情况处理

1. **空消息**: 禁用发送按钮
2. **加载中**: 禁用输入框和按钮
3. **网络错误**: 显示错误消息
4. **长消息**: 自动换行，限制输入框高度
5. **快速输入**: 防止重复发送

## 依赖

```json
{
  "dependencies": {
    "vue": "^3.4.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

## 构建和部署

### 开发模式
```bash
cd src/ui/client
npm install
npm run dev
# 访问 http://localhost:5173
```

### 生产构建
```bash
npm run build
# 输出到 dist/ui/
```

### 集成到服务器
```javascript
// src/server/api.js
import express from 'express';
import path from 'path';

const app = express();

// 静态文件服务
app.use(express.static(path.join(__dirname, '../../dist/ui')));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dist/ui/index.html'));
});
```

## 验收标准

- [ ] 访问 http://localhost:3000 显示对话界面
- [ ] 输入框可输入文本
- [ ] 按 Enter 发送消息
- [ ] 用户消息右对齐，AI 消息左对齐
- [ ] AI 回复流式显示（逐字）
- [ ] 自动滚动到最新消息
- [ ] 响应式布局（手机/平板/桌面）
- [ ] 加载时禁用输入
- [ ] 错误时显示错误消息
