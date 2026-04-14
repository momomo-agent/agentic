<template>
  <div class="act-panel">
    <p class="hint">agentic-act — 多模态输入 → 结构化行动决策。AI 决定"做什么"，你决定"怎么做"</p>

    <div class="act-section">
      <h3>📋 注册的行动</h3>
      <div class="act-actions">
        <div class="act-action-card" v-for="a in actions" :key="a.id">
          <span class="act-action-icon">{{ a.icon }}</span>
          <span class="act-action-name">{{ a.name }}</span>
          <span class="act-action-desc">{{ a.description }}</span>
        </div>
      </div>
    </div>

    <div class="act-section">
      <h3>🎯 输入意图</h3>
      <div class="act-controls">
        <input v-model="intentText" @keydown.enter="decide" placeholder="例如：外卖到了、会议要开始了、天气变冷了..." style="flex:1" />
        <button @click="decide" :disabled="!intentText.trim() || loading" class="btn-primary">
          {{ loading ? '决策中...' : '🧠 决策' }}
        </button>
      </div>
      <div class="act-quick">
        <button v-for="q in quickIntents" :key="q" @click="intentText = q; decide()">{{ q }}</button>
      </div>
    </div>

    <div class="act-section" v-if="decision">
      <h3>⚡ 决策结果</h3>
      <div class="act-decision">
        <div class="act-decision-row">
          <span class="act-label">选中行动</span>
          <span class="act-value act-action-highlight">{{ decision.action }}</span>
        </div>
        <div class="act-decision-row" v-if="decision.params">
          <span class="act-label">参数</span>
          <pre class="act-value">{{ JSON.stringify(decision.params, null, 2) }}</pre>
        </div>
        <div class="act-decision-row" v-if="decision.reason">
          <span class="act-label">理由</span>
          <span class="act-value">{{ decision.reason }}</span>
        </div>
        <div class="act-decision-row" v-if="decision.confidence != null">
          <span class="act-label">置信度</span>
          <div class="act-confidence">
            <div class="act-confidence-bar" :style="{ width: (decision.confidence * 100) + '%' }"></div>
            <span>{{ (decision.confidence * 100).toFixed(0) }}%</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ai } from './utils.js'

const props = defineProps({ markTested: Function })
defineEmits(['back'])

const intentText = ref('')
const loading = ref(false)
const decision = ref(null)

const actions = [
  { id: 'voice', icon: '🔊', name: '语音播报', description: '通过音箱语音告知' },
  { id: 'notification', icon: '🔔', name: '屏幕通知', description: '屏幕弹出通知' },
  { id: 'message', icon: '💬', name: '发消息', description: '发送文字消息' },
  { id: 'silent', icon: '🤫', name: '静默记录', description: '记录但不打扰' },
]

const quickIntents = ['外卖到了', '会议 5 分钟后开始', '下雨了窗户还开着', '有人按门铃']

async function decide() {
  if (!intentText.value.trim() || loading.value) return
  loading.value = true
  decision.value = null

  const prompt = `你是一个行动决策引擎。根据用户意图，从以下行动中选择最合适的一个。

可用行动：
${actions.map(a => `- ${a.id}: ${a.name} — ${a.description}`).join('\n')}

用户意图：${intentText.value}

请用 JSON 格式回复：
{"action": "行动id", "params": {"content": "具体内容"}, "reason": "决策理由", "confidence": 0.0-1.0}`

  try {
    let text = ''
    for await (const chunk of ai.think(prompt, { stream: true })) {
      if (chunk.type === 'text_delta') text += chunk.text || ''
    }
    // Extract JSON from response
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      decision.value = JSON.parse(match[0])
    } else {
      decision.value = { action: 'unknown', reason: text, confidence: 0 }
    }
    props.markTested?.('act')
  } catch (e) {
    decision.value = { action: 'error', reason: e.message, confidence: 0 }
  }
  loading.value = false
}
</script>

<style scoped>
@import './_shared.css';
.act-panel { display: flex; flex-direction: column; gap: 24px; }
.act-section h3 { font-size: 15px; margin-bottom: 12px; }
.act-actions { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; }
.act-action-card { background: var(--surface-2, #1e293b); border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 4px; }
.act-action-icon { font-size: 24px; }
.act-action-name { font-weight: 600; font-size: 14px; }
.act-action-desc { font-size: 12px; color: var(--text-secondary, #94a3b8); }
.act-controls { display: flex; gap: 8px; }
.act-controls input { padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border, #334155); background: var(--surface-2, #1e293b); color: var(--text); font-size: 14px; }
.act-quick { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
.act-quick button { padding: 4px 12px; border-radius: 16px; border: 1px solid var(--border, #334155); background: transparent; color: var(--text-secondary, #94a3b8); cursor: pointer; font-size: 12px; }
.act-quick button:hover { background: var(--surface-3, #374151); color: var(--text); }
.act-decision { background: var(--surface-2, #1e293b); border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.act-decision-row { display: flex; gap: 12px; align-items: flex-start; }
.act-label { font-size: 12px; color: var(--text-secondary, #94a3b8); min-width: 60px; padding-top: 2px; }
.act-value { font-size: 14px; color: var(--text); }
.act-value pre { margin: 0; font-size: 12px; font-family: monospace; }
.act-action-highlight { font-weight: 600; color: var(--accent, #3b82f6); font-size: 16px; }
.act-confidence { display: flex; align-items: center; gap: 8px; flex: 1; }
.act-confidence-bar { height: 6px; background: var(--accent, #3b82f6); border-radius: 3px; transition: width 0.3s; }
.act-confidence span { font-size: 13px; color: var(--text-secondary); }
</style>
