<template>
  <div class="examples">
    <!-- Category Filter -->
    <div class="category-bar" v-if="!activeExample">
      <button
        v-for="cat in categories" :key="cat.id"
        class="cat-btn" :class="{ active: activeCategory === cat.id }"
        @click="activeCategory = cat.id"
      >{{ cat.icon }} {{ cat.label }}</button>
    </div>

    <!-- Example Cards Grid -->
    <div class="cards" v-if="!activeExample">
      <div class="card example-card" v-for="ex in filteredExamples" :key="ex.id" @click="openExample(ex.id)">
        <div class="example-icon">{{ ex.icon }}</div>
        <div class="example-title">{{ ex.title }}</div>
        <div class="example-desc">{{ ex.desc }}</div>
        <div class="example-status" :class="ex.tested ? 'tested' : ''">
          {{ ex.tested ? '✓ 已测试' : '待测试' }}
        </div>
      </div>
    </div>

    <!-- Active Example Panel -->
    <div class="panel" v-if="activeExample">
      <div class="panel-header">
        <button class="btn-back" @click="closeExample">← 返回</button>
        <span class="panel-title">{{ currentExample.icon }} {{ currentExample.title }}</span>
      </div>
      <component :is="panelComponent" :mark-tested="markTested" @back="closeExample" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, defineAsyncComponent } from 'vue'

const panels = {
  'chat': defineAsyncComponent(() => import('./examples/ChatPanel.vue')),
  'multimodal': defineAsyncComponent(() => import('./examples/MultimodalPanel.vue')),
  'doc-qa': defineAsyncComponent(() => import('./examples/DocQaPanel.vue')),
  'function-call': defineAsyncComponent(() => import('./examples/FunctionCallPanel.vue')),
  'structured': defineAsyncComponent(() => import('./examples/StructuredPanel.vue')),
  'vision': defineAsyncComponent(() => import('./examples/VisionPanel.vue')),
  'vision-chat': defineAsyncComponent(() => import('./examples/VisionChatPanel.vue')),
  'vision-voice': defineAsyncComponent(() => import('./examples/VisionVoicePanel.vue')),
  'annotate': defineAsyncComponent(() => import('./examples/AnnotatePanel.vue')),
  'live-vision': defineAsyncComponent(() => import('./examples/LiveVisionPanel.vue')),
  'voice': defineAsyncComponent(() => import('./examples/VoicePanel.vue')),
  'tts': defineAsyncComponent(() => import('./examples/TtsPanel.vue')),
  'parlor': defineAsyncComponent(() => import('./examples/ParlorPanel.vue')),
  'dictation': defineAsyncComponent(() => import('./examples/DictationPanel.vue')),
  'subtitle': defineAsyncComponent(() => import('./examples/SubtitlePanel.vue')),
  'voice-note': defineAsyncComponent(() => import('./examples/VoiceNotePanel.vue')),
  'voice-pipeline': defineAsyncComponent(() => import('./examples/VoicePipelinePanel.vue')),
  'wake-word': defineAsyncComponent(() => import('./examples/WakeWordPanel.vue')),
  'translate': defineAsyncComponent(() => import('./examples/TranslatePanel.vue')),
  'storyteller': defineAsyncComponent(() => import('./examples/StorytellerPanel.vue')),
  'omni-chat': defineAsyncComponent(() => import('./examples/OmniChatPanel.vue')),
  'api-compat': defineAsyncComponent(() => import('./examples/ApiCompatPanel.vue')),
  'perf': defineAsyncComponent(() => import('./examples/PerfPanel.vue')),
  'devices': defineAsyncComponent(() => import('./examples/DevicesPanel.vue')),
  'logs': defineAsyncComponent(() => import('./examples/LogsPanel.vue')),
}

const categories = [
  { id: 'all', label: '全部', icon: '📋' },
  { id: 'chat', label: '对话', icon: '🗣️' },
  { id: 'vision', label: '视觉', icon: '👁️' },
  { id: 'voice', label: '语音', icon: '🎤' },
  { id: 'app', label: '应用', icon: '🌐' },
  { id: 'dev', label: '开发', icon: '🔧' },
]
const activeCategory = ref('all')

const examples = ref([
  // 🗣️ 对话
  { id: 'chat', icon: '💬', title: 'Chat Playground', desc: '与本地 AI 对话', tested: false, cat: 'chat' },
  { id: 'multimodal', icon: '🌈', title: '多模态对话', desc: '文字+图片+语音，全模态聊天', tested: false, cat: 'chat' },
  { id: 'doc-qa', icon: '📄', title: '文档问答', desc: '粘贴文档，AI 回答问题', tested: false, cat: 'chat' },
  { id: 'function-call', icon: '🔧', title: 'Function Calling', desc: '演示 AI 工具调用能力', tested: false, cat: 'chat' },
  { id: 'structured', icon: '📊', title: '结构化输出', desc: '文本提取、摘要、情感分析', tested: false, cat: 'chat' },
  // 👁️ 视觉
  { id: 'vision', icon: '👁️', title: '图像识别', desc: '上传图片或拍照，AI 实时分析', tested: false, cat: 'vision' },
  { id: 'vision-chat', icon: '🖼️', title: '看图聊天', desc: '上传图片，连续提问', tested: false, cat: 'vision' },
  { id: 'vision-voice', icon: '📷', title: '看图说话', desc: '拍照或上传，AI 语音描述', tested: false, cat: 'vision' },
  { id: 'annotate', icon: '✏️', title: '图片批注', desc: '上传图片，AI 标注并解释各区域', tested: false, cat: 'vision' },
  { id: 'live-vision', icon: '📹', title: '实时摄像头', desc: '摄像头持续拍帧，AI 实时描述', tested: false, cat: 'vision' },
  // 🎤 语音
  { id: 'voice', icon: '🎤', title: '实时语音识别', desc: '麦克风实时转文字', tested: false, cat: 'voice' },
  { id: 'tts', icon: '🔊', title: '语音合成', desc: '文字转语音，试听不同声音', tested: false, cat: 'voice' },
  { id: 'parlor', icon: '🗣️', title: '语音对话', desc: '像 Parlor 一样，说话→AI 语音回复', tested: false, cat: 'voice' },
  { id: 'dictation', icon: '📝', title: '连续听写', desc: '持续录音，实时转文字，像会议记录', tested: false, cat: 'voice' },
  { id: 'subtitle', icon: '📺', title: '实时字幕', desc: '麦克风实时生成字幕，大字显示', tested: false, cat: 'voice' },
  { id: 'voice-note', icon: '🎙️', title: '语音笔记', desc: '说话→AI 整理成结构化笔记', tested: false, cat: 'voice' },
  { id: 'voice-pipeline', icon: '⚡', title: '语音管道', desc: '一次调用：录音→理解→语音回复', tested: false, cat: 'voice' },
  { id: 'wake-word', icon: '🔔', title: '语音唤醒', desc: '实时识别语音，关键词高亮唤醒', tested: false, cat: 'voice' },
  // 🌐 应用
  { id: 'translate', icon: '🌐', title: '翻译助手', desc: '说话或输入文字，AI 翻译并朗读', tested: false, cat: 'app' },
  { id: 'storyteller', icon: '📖', title: '故事讲述', desc: '输入主题，AI 写故事并朗读', tested: false, cat: 'app' },
  { id: 'omni-chat', icon: '🌀', title: '多模态实时对话', desc: '摄像头+麦克风+文字，全感官 AI 对话', tested: false, cat: 'app' },
  // 🔧 开发
  { id: 'api-compat', icon: '🔌', title: 'API 兼容', desc: '测试 OpenAI / Anthropic 兼容接口', tested: false, cat: 'dev' },
  { id: 'perf', icon: '📈', title: '性能监控', desc: '实时查看 API 延迟和吞吐', tested: false, cat: 'dev' },
  { id: 'devices', icon: '📱', title: '设备管理', desc: '查看连接的 IoT/边缘设备', tested: false, cat: 'dev' },
  { id: 'logs', icon: '📋', title: '系统日志', desc: '查看最近的 API 调用日志', tested: false, cat: 'dev' },
])

const filteredExamples = computed(() => {
  if (activeCategory.value === 'all') return examples.value
  return examples.value.filter(e => e.cat === activeCategory.value)
})

const activeExample = ref(null)
const currentExample = computed(() => examples.value.find(e => e.id === activeExample.value) || {})
const panelComponent = computed(() => panels[activeExample.value])

function openExample(id) { activeExample.value = id }
function closeExample() { activeExample.value = null }

function markTested(id) {
  const ex = examples.value.find(e => e.id === id)
  if (ex) ex.tested = true
}
</script>

<style scoped>
.examples { padding: 0; }

/* Category Filter Bar */
.category-bar {
  display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap;
}
.cat-btn {
  padding: 6px 14px; border-radius: 20px; border: 1px solid #333;
  background: transparent; color: #aaa; cursor: pointer; font-size: 13px;
  transition: all 0.15s;
}
.cat-btn:hover { border-color: #555; color: #ddd; }
.cat-btn.active { background: #2a2a2a; border-color: #666; color: #fff; }

/* Cards Grid */
.cards {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}
.example-card {
  cursor: pointer; transition: transform 0.15s, box-shadow 0.15s;
  text-align: center; padding: 28px 20px;
}
.example-card:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.2); }
.example-icon { font-size: 36px; margin-bottom: 12px; }
.example-title { font-weight: 600; font-size: 15px; margin-bottom: 6px; }
.example-desc { font-size: 13px; color: var(--text-dim); margin-bottom: 12px; }
.example-status {
  font-size: 12px; padding: 3px 10px; border-radius: 10px; display: inline-block;
  background: var(--surface-3, #374151); color: var(--text-dim);
}
.example-status.tested { background: rgba(34,197,94,0.15); color: #22c55e; }

/* Panel */
.panel-header {
  display: flex; align-items: center; gap: 12px; margin-bottom: 20px;
}
.btn-back {
  background: var(--surface-3, #374151); border: none; color: var(--text);
  padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 13px;
}
.panel-title { font-weight: 600; font-size: 16px; }
</style>
