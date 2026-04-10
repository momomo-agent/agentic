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

      <!-- Chat Playground -->
      <div v-if="activeExample === 'chat'" class="chat-panel">
        <div class="chat-messages" ref="chatEl">
          <div v-for="(msg, i) in chatHistory" :key="i" class="chat-msg" :class="msg.role">
            <div class="msg-bubble" v-if="msg.content">{{ msg.content }}</div>
            <div class="msg-bubble loading" v-else-if="msg.role === 'assistant' && chatLoading">
              <span class="typing-dots"><span>.</span><span>.</span><span>.</span></span>
            </div>
          </div>
        </div>
        <div class="chat-input-row">
          <input v-model="chatInput" @keydown.enter="sendChat" placeholder="输入消息..." :disabled="chatLoading" />
          <button @click="sendChat" :disabled="chatLoading || !chatInput.trim()">发送</button>
        </div>
      </div>

      <!-- Vision -->
      <div v-if="activeExample === 'vision'" class="vision-panel">
        <div class="vision-controls">
          <div class="vision-source-tabs">
            <button :class="{ active: visionSource === 'upload' }" @click="visionSource = 'upload'">📁 上传图片</button>
            <button :class="{ active: visionSource === 'camera' }" @click="startCamera">📷 拍照</button>
          </div>

          <!-- Upload -->
          <div v-if="visionSource === 'upload'" class="upload-area" @click="$refs.fileInput.click()" @dragover.prevent @drop.prevent="handleDrop">
            <input ref="fileInput" type="file" accept="image/*" @change="handleFile" hidden />
            <div v-if="!visionImage" class="upload-placeholder">
              <span class="upload-icon">🖼️</span>
              <span>点击或拖拽图片到这里</span>
            </div>
            <img v-else :src="visionImage" class="preview-img" />
          </div>

          <!-- Camera -->
          <div v-if="visionSource === 'camera'" class="camera-area">
            <video ref="videoEl" autoplay playsinline class="camera-video"></video>
            <button class="btn-capture" @click="capturePhoto">📸 拍照</button>
          </div>

          <div class="vision-prompt-row">
            <input v-model="visionPrompt" placeholder="问点什么...（默认：描述这张图片）" @keydown.enter="analyzeImage" />
            <button @click="analyzeImage" :disabled="!visionImage || visionLoading">
              {{ visionLoading ? '分析中...' : '🔍 分析' }}
            </button>
          </div>
        </div>

        <div class="vision-result" v-if="visionResult">
          <div class="result-label">分析结果</div>
          <div class="result-text">{{ visionResult }}</div>
        </div>
      </div>

      <!-- Voice -->
      <div v-if="activeExample === 'voice'" class="voice-panel">
        <div class="voice-status" :class="{ recording: voiceRecording }">
          <div class="voice-indicator">
            <div class="pulse-ring" v-if="voiceRecording"></div>
            <span class="voice-icon">{{ voiceRecording ? '🔴' : '🎙️' }}</span>
          </div>
          <div class="voice-state">{{ voiceRecording ? '正在录音...' : '点击开始' }}</div>
        </div>

        <button class="btn-voice" :class="{ active: voiceRecording }" @click="toggleVoice">
          {{ voiceRecording ? '⏹ 停止' : '🎤 开始录音' }}
        </button>

        <div class="voice-result" v-if="voiceText">
          <div class="result-label">识别结果</div>
          <div class="result-text">{{ voiceText }}</div>
        </div>

        <div class="voice-info">
          <p>使用 MediaRecorder 录音 + /api/transcribe 本地转写</p>
        </div>
      </div>

      <!-- Structured Output -->
      <div v-if="activeExample === 'structured'" class="structured-panel">
        <div class="structured-controls">
          <textarea v-model="structuredInput" placeholder="输入文本，AI 会提取结构化信息..." rows="4"></textarea>
          <div class="structured-format">
            <label>输出格式：</label>
            <select v-model="structuredFormat">
              <option value="json">JSON</option>
              <option value="summary">摘要</option>
              <option value="entities">实体提取</option>
              <option value="sentiment">情感分析</option>
            </select>
          </div>
          <button @click="runStructured" :disabled="!structuredInput.trim() || structuredLoading">
            {{ structuredLoading ? '处理中...' : '🚀 处理' }}
          </button>
        </div>
        <div class="structured-result" v-if="structuredResult">
          <div class="result-label">结果</div>
          <pre class="result-code">{{ structuredResult }}</pre>
        </div>
      </div>

      <!-- TTS 语音合成 -->
      <div v-if="activeExample === 'tts'" class="tts-panel">
        <div class="tts-controls">
          <textarea v-model="ttsInput" placeholder="输入要合成的文字..." rows="3"></textarea>
          <button @click="runTts" :disabled="!ttsInput.trim() || ttsLoading">
            {{ ttsLoading ? '合成中...' : '🔊 合成语音' }}
          </button>
        </div>
        <div class="tts-result" v-if="ttsAudioUrl || ttsLatency">
          <div class="result-label">合成结果</div>
          <audio v-if="ttsAudioUrl" :src="ttsAudioUrl" controls class="tts-audio"></audio>
          <div v-if="ttsLatency" class="tts-latency">延迟: {{ ttsLatency }}ms</div>
        </div>
      </div>

      <!-- Parlor 语音对话 -->
      <div v-if="activeExample === 'parlor'" class="parlor-panel">
        <div class="parlor-messages" ref="parlorEl">
          <div v-for="(msg, i) in parlorHistory" :key="i" class="chat-msg" :class="msg.role">
            <div class="msg-bubble">
              {{ msg.content }}
              <button v-if="msg.role === 'assistant' && msg.audioUrl" class="btn-play-inline" @click="playAudio(msg.audioUrl)">▶</button>
            </div>
          </div>
          <div v-if="parlorTranscribing" class="chat-msg user">
            <div class="msg-bubble loading">识别中...</div>
          </div>
        </div>
        <div class="parlor-controls">
          <button
            class="btn-voice"
            :class="{ active: parlorRecording }"
            @mousedown.prevent="parlorStartRec"
            @mouseup.prevent="parlorStopRec"
            @touchstart.prevent="parlorStartRec"
            @touchend.prevent="parlorStopRec"
          >
            {{ parlorRecording ? '🎙️ 松开发送' : '🎤 按住说话' }}
          </button>
          <span class="parlor-status">{{ parlorStatus }}</span>
        </div>
      </div>

      <!-- 实时摄像头识别 -->
      <div v-if="activeExample === 'live-vision'" class="live-vision-panel">
        <div class="lv-main">
          <div class="lv-video-area">
            <video ref="lvVideoEl" autoplay playsinline class="camera-video"></video>
            <canvas ref="lvCanvasEl" style="display:none"></canvas>
            <button class="btn-voice" :class="{ active: lvRunning }" @click="toggleLiveVision">
              {{ lvRunning ? '⏹ 停止' : '▶ 开始' }}
            </button>
          </div>
          <div class="lv-log" ref="lvLogEl">
            <div class="result-label">AI 描述</div>
            <div v-for="(entry, i) in lvEntries" :key="i" class="lv-entry">
              <span class="lv-time">{{ entry.time }}</span>
              <span class="lv-text">{{ entry.text }}</span>
            </div>
            <div v-if="!lvEntries.length" class="lv-empty">等待开始...</div>
          </div>
        </div>
      </div>

      <!-- 翻译助手 -->
      <div v-if="activeExample === 'translate'" class="translate-panel">
        <div class="translate-controls">
          <div class="translate-lang-row">
            <label>目标语言：</label>
            <select v-model="translateLang">
              <option value="英文">中 → 英</option>
              <option value="中文">英 → 中</option>
              <option value="中文">日 → 中</option>
            </select>
          </div>
          <div class="translate-input-row">
            <input v-model="translateInput" @keydown.enter="runTranslate" placeholder="输入要翻译的文字..." :disabled="translateLoading" />
            <button class="btn-mic-small" @click="translateFromMic" :disabled="translateMicLoading">
              {{ translateMicLoading ? '识别中...' : '🎤' }}
            </button>
            <button @click="runTranslate" :disabled="!translateInput.trim() || translateLoading">
              {{ translateLoading ? '翻译中...' : '翻译' }}
            </button>
          </div>
        </div>
        <div class="translate-result" v-if="translateOriginal || translateResult">
          <div v-if="translateOriginal" class="translate-row">
            <div class="result-label">原文</div>
            <div class="result-text">{{ translateOriginal }}</div>
          </div>
          <div v-if="translateResult" class="translate-row">
            <div class="result-label">译文</div>
            <div class="result-text">{{ translateResult }}</div>
          </div>
          <div v-if="translateAudioUrl" class="translate-row">
            <audio :src="translateAudioUrl" controls autoplay class="tts-audio"></audio>
          </div>
        </div>
      </div>

      <!-- 文档问答 -->
      <div v-if="activeExample === 'doc-qa'" class="docqa-panel">
        <div class="docqa-controls">
          <textarea v-model="docqaDoc" placeholder="粘贴文档内容..." rows="6"></textarea>
          <div class="docqa-question-row">
            <input v-model="docqaQuestion" @keydown.enter="runDocQa" placeholder="输入问题..." :disabled="docqaLoading" />
            <button @click="runDocQa" :disabled="!docqaDoc.trim() || !docqaQuestion.trim() || docqaLoading">
              {{ docqaLoading ? '回答中...' : '🔍 提问' }}
            </button>
          </div>
        </div>
        <div class="docqa-result" v-if="docqaResult">
          <div class="result-label">回答</div>
          <div class="result-text">{{ docqaResult }}</div>
        </div>
      </div>

      <!-- 连续听写 -->
      <div v-if="activeExample === 'dictation'" class="dictation-panel">
        <div class="dictation-controls">
          <button class="btn-voice" :class="{ active: dictRecording }" @click="toggleDictation">
            {{ dictRecording ? '⏹ 停止听写' : '🎙️ 开始听写' }}
          </button>
          <button class="btn-secondary" @click="copyDictation" :disabled="!dictText">📋 复制全文</button>
        </div>
        <textarea class="dictation-text" :value="dictText" readonly placeholder="开始录音后，转写文字将在这里实时显示..." rows="12"></textarea>
        <div class="dictation-footer">
          <span>总时长：{{ dictDuration }}s</span>
          <span>字数：{{ dictText.length }}</span>
        </div>
      </div>

      <!-- 看图聊天 -->
      <div v-if="activeExample === 'vision-chat'" class="vision-chat-panel">
        <div class="vc-layout">
          <div class="vc-image-area" @click="$refs.vcFileInput.click()" @dragover.prevent @drop.prevent="handleVcDrop">
            <input ref="vcFileInput" type="file" accept="image/*" @change="handleVcFile" hidden />
            <div v-if="!vcImage" class="upload-placeholder">
              <span class="upload-icon">🖼️</span>
              <span>点击或拖拽上传图片</span>
            </div>
            <img v-else :src="vcImage" class="preview-img" />
          </div>
          <div class="vc-chat-area">
            <div class="chat-messages" ref="vcChatEl">
              <div v-for="(msg, i) in vcHistory" :key="i" class="chat-msg" :class="msg.role">
                <div class="msg-bubble">{{ msg.content }}</div>
              </div>
            </div>
            <div class="chat-input-row">
              <input v-model="vcInput" @keydown.enter="sendVcChat" placeholder="对图片提问..." :disabled="vcLoading || !vcImage" />
              <button @click="sendVcChat" :disabled="vcLoading || !vcImage || !vcInput.trim()">发送</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 看图说话 -->
      <div v-if="activeExample === 'vision-voice'" class="vision-voice-panel">
        <div class="vv-controls">
          <div class="vision-source-tabs">
            <button :class="{ active: vvSource === 'upload' }" @click="vvSource = 'upload'">📁 上传图片</button>
            <button :class="{ active: vvSource === 'camera' }" @click="startVvCamera">📷 拍照</button>
          </div>
          <div v-if="vvSource === 'upload'" class="upload-area" @click="$refs.vvFileInput.click()" @dragover.prevent @drop.prevent="handleVvDrop">
            <input ref="vvFileInput" type="file" accept="image/*" @change="handleVvFile" hidden />
            <div v-if="!vvImage" class="upload-placeholder">
              <span class="upload-icon">🖼️</span>
              <span>点击或拖拽图片到这里</span>
            </div>
            <img v-else :src="vvImage" class="preview-img" />
          </div>
          <div v-if="vvSource === 'camera'" class="camera-area">
            <video ref="vvVideoEl" autoplay playsinline class="camera-video"></video>
            <button class="btn-capture" @click="captureVvPhoto">📸 拍照</button>
          </div>
          <button @click="runVisionVoice" :disabled="!vvImage || vvLoading" class="btn-primary">
            {{ vvLoading ? '处理中...' : '🔊 AI 描述并朗读' }}
          </button>
        </div>
        <div class="vv-result" v-if="vvDescription">
          <div class="result-label">AI 描述</div>
          <div class="result-text">{{ vvDescription }}</div>
          <audio v-if="vvAudioUrl" :src="vvAudioUrl" controls autoplay class="tts-audio"></audio>
        </div>
      </div>

      <!-- 语音笔记 -->
      <div v-if="activeExample === 'voice-note'" class="voice-note-panel">
        <div class="vn-controls">
          <button class="btn-voice" :class="{ active: vnRecording }" @click="toggleVoiceNote">
            {{ vnRecording ? '⏹ 停止录音' : '🎙️ 开始录音' }}
          </button>
          <span v-if="vnStatus" class="vn-status">{{ vnStatus }}</span>
        </div>
        <div class="vn-results" v-if="vnTranscript || vnNote">
          <div v-if="vnTranscript" class="vn-section">
            <div class="result-label">原始转写</div>
            <div class="result-text">{{ vnTranscript }}</div>
          </div>
          <div v-if="vnNote" class="vn-section">
            <div class="result-label">AI 整理笔记</div>
            <div class="result-text" style="white-space: pre-wrap;">{{ vnNote }}</div>
          </div>
        </div>
      </div>

      <!-- 实时字幕 -->
      <div v-if="activeExample === 'subtitle'" class="subtitle-panel" :class="'font-' + subtitleSize">
        <div class="subtitle-controls">
          <button class="btn-voice" :class="{ active: subRecording }" @click="toggleSubtitle">
            {{ subRecording ? '⏹ 停止' : '🎙️ 开始字幕' }}
          </button>
          <div class="subtitle-size-btns">
            <button :class="{ active: subtitleSize === 'small' }" @click="subtitleSize = 'small'">小</button>
            <button :class="{ active: subtitleSize === 'medium' }" @click="subtitleSize = 'medium'">中</button>
            <button :class="{ active: subtitleSize === 'large' }" @click="subtitleSize = 'large'">大</button>
          </div>
        </div>
        <div class="subtitle-display">
          <div class="subtitle-current">{{ subCurrent || '等待语音...' }}</div>
          <div class="subtitle-history" ref="subHistoryEl">
            <div v-for="(line, i) in subHistory" :key="i" class="subtitle-line">{{ line }}</div>
          </div>
        </div>
      </div>

      <!-- 故事讲述 -->
      <div v-if="activeExample === 'storyteller'" class="storyteller-panel">
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

      <!-- 多模态对话 -->
      <div v-if="activeExample === 'multimodal'" class="multimodal-panel">
        <div class="chat-messages" ref="mmChatEl">
          <div v-for="(msg, i) in mmHistory" :key="i" class="chat-msg" :class="msg.role">
            <img v-if="msg.image" :src="msg.image" class="mm-msg-img" />
            <div class="msg-bubble" v-if="msg.content">{{ msg.content }}</div>
            <button v-if="msg.role === 'assistant' && msg.content" class="btn-play-inline" @click="mmTtsPlay(msg.content)">🔊</button>
          </div>
        </div>
        <div class="mm-input-row">
          <input v-model="mmInput" @keydown.enter="sendMmText" placeholder="输入消息..." :disabled="mmLoading" />
          <button @click="sendMmText" :disabled="mmLoading || !mmInput.trim()">发送</button>
          <button @click="$refs.mmFileInput.click()" :disabled="mmLoading">📷</button>
          <input ref="mmFileInput" type="file" accept="image/*" @change="sendMmImage" hidden />
          <button @click="sendMmVoice" :disabled="mmLoading || mmRecording">{{ mmRecording ? '识别中...' : '🎤' }}</button>
        </div>
      </div>

      <!-- 图片批注 -->
      <div v-if="activeExample === 'annotate'" class="annotate-panel">
        <div class="ann-layout">
          <div class="ann-image-area" @click="$refs.annFileInput.click()" @dragover.prevent @drop.prevent="handleAnnDrop">
            <input ref="annFileInput" type="file" accept="image/*" @change="handleAnnFile" hidden />
            <div v-if="!annImage" class="upload-placeholder">
              <span class="upload-icon">🖼️</span>
              <span>点击或拖拽上传图片</span>
            </div>
            <img v-else :src="annImage" class="preview-img" />
          </div>
          <div class="ann-result-area">
            <button @click="runAnnotate" :disabled="!annImage || annLoading" class="btn-primary" style="align-self: flex-start;">
              {{ annLoading ? '分析中...' : '✏️ AI 批注' }}
            </button>
            <div class="result-text" v-if="annResult" style="white-space: pre-wrap;">{{ annResult }}</div>
          </div>
        </div>
      </div>
      <!-- Voice Pipeline 语音管道 -->
      <div v-if="activeExample === 'voice-pipeline'" class="vp-panel">
        <p class="hint">录音后一次调用 /api/voice（STT→LLM→TTS），最低延迟语音交互</p>
        <div class="vp-controls">
          <button @click="toggleVp" :class="{ recording: vpRecording }" class="btn-primary">
            {{ vpRecording ? '⏹ 停止录音' : '🎤 开始录音' }}
          </button>
          <span v-if="vpLatency !== null" class="vp-latency">延迟: {{ vpLatency }} ms</span>
        </div>
        <div v-if="vpLoading" class="vp-status">处理中...</div>
        <div v-if="vpAudioUrl" class="vp-result">
          <audio :src="vpAudioUrl" controls autoplay></audio>
        </div>
        <div v-if="vpError" class="result-text" style="color:#ef4444;">{{ vpError }}</div>
      </div>

      <!-- API Compat 兼容测试 -->
      <div v-if="activeExample === 'api-compat'" class="compat-panel">
        <div class="compat-tabs">
          <button :class="{ active: compatTab === 'openai' }" @click="compatTab = 'openai'">OpenAI</button>
          <button :class="{ active: compatTab === 'anthropic' }" @click="compatTab = 'anthropic'">Anthropic</button>
        </div>

        <div v-if="compatTab === 'openai'" class="compat-section">
          <div class="compat-endpoint">POST /v1/chat/completions</div>
          <textarea v-model="compatOpenaiBody" rows="8" class="compat-textarea"></textarea>
          <div class="compat-row">
            <label class="compat-toggle"><input type="checkbox" v-model="compatOpenaiStream" /> Stream</label>
            <button @click="sendCompat('openai')" :disabled="compatLoading" class="btn-primary">发送</button>
          </div>
          <pre v-if="compatResult" class="compat-result">{{ compatResult }}</pre>
        </div>

        <div v-if="compatTab === 'anthropic'" class="compat-section">
          <div class="compat-endpoint">POST /v1/messages</div>
          <textarea v-model="compatAnthropicBody" rows="8" class="compat-textarea"></textarea>
          <div class="compat-row">
            <button @click="sendCompat('anthropic')" :disabled="compatLoading" class="btn-primary">发送</button>
          </div>
          <pre v-if="compatResult" class="compat-result">{{ compatResult }}</pre>
        </div>
      </div>

      <!-- Function Calling -->
      <div v-if="activeExample === 'function-call'" class="fc-panel">
        <p class="hint">输入问题，AI 会自动调用合适的工具</p>
        <div class="fc-tools">
          <span class="fc-tool-tag" v-for="t in fcTools" :key="t.name">🔧 {{ t.name }}</span>
        </div>
        <div class="fc-input-row">
          <input v-model="fcInput" @keydown.enter="sendFc" placeholder="例如：北京天气怎么样" :disabled="fcLoading" />
          <button @click="sendFc" :disabled="fcLoading || !fcInput.trim()" class="btn-primary">发送</button>
        </div>
        <div v-if="fcToolCalls.length" class="fc-calls">
          <div class="fc-call" v-for="(c, i) in fcToolCalls" :key="i">
            <span class="fc-call-name">{{ c.name }}</span>
            <span class="fc-call-args">{{ JSON.stringify(c.args) }}</span>
          </div>
        </div>
        <div v-if="fcResult" class="result-text" style="white-space:pre-wrap;">{{ fcResult }}</div>
      </div>

      <!-- Perf 性能监控 -->
      <div v-if="activeExample === 'perf'" class="perf-panel">
        <div class="perf-header">
          <button @click="fetchPerf" :disabled="perfLoading" class="btn-primary">刷新</button>
          <label class="compat-toggle"><input type="checkbox" v-model="perfAuto" @change="togglePerfAuto" /> 自动刷新 (3s)</label>
        </div>
        <div v-if="perfLoading && !perfData" class="vp-status">加载中...</div>
        <div v-if="perfData" class="perf-table">
          <div class="perf-row perf-row-header">
            <span class="perf-col-name">API</span>
            <span class="perf-col-num">调用次数</span>
            <span class="perf-col-num">平均延迟</span>
            <span class="perf-col-num">P95</span>
            <span class="perf-col-bar">延迟分布</span>
          </div>
          <div class="perf-row" v-for="(m, key) in perfData" :key="key">
            <span class="perf-col-name">{{ key }}</span>
            <span class="perf-col-num">{{ m.count }}</span>
            <span class="perf-col-num">{{ m.avg_ms?.toFixed(1) ?? '-' }} ms</span>
            <span class="perf-col-num">{{ m.p95_ms?.toFixed(1) ?? '-' }} ms</span>
            <span class="perf-col-bar"><div class="perf-bar" :style="{ width: Math.min((m.avg_ms || 0) / perfMaxMs * 100, 100) + '%' }"></div></span>
          </div>
        </div>
        <div v-if="perfError" class="result-text" style="color:#ef4444;">{{ perfError }}</div>
      </div>

      <!-- Devices 设备管理 -->
      <div v-if="activeExample === 'devices'" class="devices-panel">
        <div class="perf-header">
          <button @click="fetchDevices" :disabled="devicesLoading" class="btn-primary">刷新</button>
        </div>
        <div v-if="devicesLoading && !devicesList.length" class="vp-status">加载中...</div>
        <div v-if="devicesList.length" class="devices-list">
          <div class="device-card" v-for="d in devicesList" :key="d.id">
            <div class="device-id">{{ d.id }}</div>
            <div class="device-type">{{ d.type || '未知' }}</div>
            <div class="device-status" :class="d.status === 'online' ? 'online' : 'offline'">{{ d.status }}</div>
            <div class="device-heartbeat">{{ d.last_heartbeat || '-' }}</div>
          </div>
        </div>
        <div v-if="!devicesLoading && !devicesList.length && !devicesError" class="devices-empty">
          <p>暂无设备连接</p>
          <p class="hint">通过 POST /api/devices/register 注册设备，设备需定期发送心跳到 POST /api/devices/:id/heartbeat</p>
        </div>
        <div v-if="devicesError" class="result-text" style="color:#ef4444;">{{ devicesError }}</div>
      </div>

      <!-- Logs 系统日志 -->
      <div v-if="activeExample === 'logs'" class="logs-panel">
        <div class="perf-header">
          <button @click="fetchLogs" :disabled="logsLoading" class="btn-primary">刷新</button>
          <label class="compat-toggle"><input type="checkbox" v-model="logsAuto" @change="toggleLogsAuto" /> 自动刷新 (5s)</label>
        </div>
        <div v-if="logsLoading && !logsList.length" class="vp-status">加载中...</div>
        <div class="logs-terminal" v-if="logsList.length">
          <div class="log-line" v-for="(l, i) in logsList" :key="i">
            <span class="log-ts">{{ l.timestamp || l.ts || '' }}</span>
            <span class="log-content">{{ l.message || l.content || JSON.stringify(l) }}</span>
          </div>
        </div>
        <div v-if="!logsLoading && !logsList.length && !logsError" class="hint" style="padding:20px;">暂无日志</div>
        <div v-if="logsError" class="result-text" style="color:#ef4444;">{{ logsError }}</div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onUnmounted, computed } from 'vue'

const categories = [
  { id: 'all', label: '全部', icon: '📋' },
  { id: 'chat', label: '对话', icon: '🗣️' },
  { id: 'vision', label: '视觉', icon: '👁️' },
  { id: 'voice', label: '语音', icon: '🎤' },
  { id: 'app', label: '应用', icon: '🌐' },
  { id: 'dev', label: '开发', icon: '🔧' },
]
const activeCategory = ref('all')
const filteredExamples = computed(() => {
  if (activeCategory.value === 'all') return examples.value
  return examples.value.filter(e => e.cat === activeCategory.value)
})

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
  // 🌐 应用
  { id: 'translate', icon: '🌐', title: '翻译助手', desc: '说话或输入文字，AI 翻译并朗读', tested: false, cat: 'app' },
  { id: 'storyteller', icon: '📖', title: '故事讲述', desc: '输入主题，AI 写故事并朗读', tested: false, cat: 'app' },
  // 🔧 开发
  { id: 'api-compat', icon: '🔌', title: 'API 兼容', desc: '测试 OpenAI / Anthropic 兼容接口', tested: false, cat: 'dev' },
  { id: 'perf', icon: '📈', title: '性能监控', desc: '实时查看 API 延迟和吞吐', tested: false, cat: 'dev' },
  { id: 'devices', icon: '📱', title: '设备管理', desc: '查看连接的 IoT/边缘设备', tested: false, cat: 'dev' },
  { id: 'logs', icon: '📋', title: '系统日志', desc: '查看最近的 API 调用日志', tested: false, cat: 'dev' },
])

const activeExample = ref(null)
const currentExample = computed(() => examples.value.find(e => e.id === activeExample.value) || {})

function openExample(id) { activeExample.value = id }
function closeExample() {
  stopCamera()
  stopVoice()
  closeParlorWs()
  stopLiveVision()
  stopDictation()
  stopVvCamera()
  stopSubtitle()
  activeExample.value = null
}

// ── Chat ──
const chatHistory = ref([])
const chatInput = ref('')
const chatLoading = ref(false)
const chatEl = ref(null)

async function sendChat() {
  const msg = chatInput.value.trim()
  if (!msg || chatLoading.value) return
  chatHistory.value.push({ role: 'user', content: msg })
  chatInput.value = ''
  chatLoading.value = true
  await nextTick()
  scrollChat()

  const assistantMsg = { role: 'assistant', content: '' }
  chatHistory.value.push(assistantMsg)

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, history: chatHistory.value.slice(0, -1) })
    })
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      for (const line of decoder.decode(value).split('\n')) {
        if (!line.startsWith('data: ') || line.includes('[DONE]')) continue
        try {
          const data = JSON.parse(line.slice(6))
          assistantMsg.content += data.content || data.text || ''
          await nextTick()
          scrollChat()
        } catch {}
      }
    }
    markTested('chat')
  } catch (e) {
    assistantMsg.content = `错误: ${e.message}`
  }
  chatLoading.value = false
}

function scrollChat() {
  if (chatEl.value) chatEl.value.scrollTop = chatEl.value.scrollHeight
}

// ── Vision ──
const visionSource = ref('upload')
const visionImage = ref(null)
const visionPrompt = ref('')
const visionResult = ref('')
const visionLoading = ref(false)
const videoEl = ref(null)
let mediaStream = null

function handleFile(e) {
  const file = e.target.files[0]
  if (file) readImage(file)
}

function handleDrop(e) {
  const file = e.dataTransfer.files[0]
  if (file && file.type.startsWith('image/')) readImage(file)
}

function readImage(file) {
  const reader = new FileReader()
  reader.onload = () => { visionImage.value = reader.result; visionResult.value = '' }
  reader.readAsDataURL(file)
}

async function startCamera() {
  visionSource.value = 'camera'
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    await nextTick()
    if (videoEl.value) videoEl.value.srcObject = mediaStream
  } catch (e) {
    console.error('Camera error:', e)
  }
}

function stopCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop())
    mediaStream = null
  }
}

function capturePhoto() {
  if (!videoEl.value) return
  const canvas = document.createElement('canvas')
  const maxW = 1024
  const vw = videoEl.value.videoWidth, vh = videoEl.value.videoHeight
  const scale = vw > maxW ? maxW / vw : 1
  canvas.width = vw * scale
  canvas.height = vh * scale
  canvas.getContext('2d').drawImage(videoEl.value, 0, 0, canvas.width, canvas.height)
  visionImage.value = canvas.toDataURL('image/jpeg', 0.7)
  visionResult.value = ''
  stopCamera()
  visionSource.value = 'upload'
}

async function analyzeImage() {
  if (!visionImage.value || visionLoading.value) return
  visionLoading.value = true
  visionResult.value = ''

  try {
    const res = await fetch('/api/vision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: visionImage.value, prompt: visionPrompt.value || undefined })
    })
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      for (const line of decoder.decode(value).split('\n')) {
        if (!line.startsWith('data: ') || line.includes('[DONE]')) continue
        try {
          const data = JSON.parse(line.slice(6))
          if (data.error) { visionResult.value = `错误: ${data.error}`; break }
          visionResult.value += data.text || ''
        } catch {}
      }
    }
    markTested('vision')
  } catch (e) {
    visionResult.value = `错误: ${e.message}`
  }
  visionLoading.value = false
}

// ── Voice ──
const voiceRecording = ref(false)
const voiceText = ref('')
let voiceMediaRecorder = null
let voiceChunks = []
let voiceStream = null

function toggleVoice() {
  if (voiceRecording.value) stopVoice()
  else startVoice()
}

async function startVoice() {
  try {
    voiceStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    voiceMediaRecorder = new MediaRecorder(voiceStream)
    voiceChunks = []
    voiceText.value = ''

    voiceMediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) voiceChunks.push(e.data)
    }

    voiceMediaRecorder.onstop = async () => {
      if (!voiceChunks.length) return
      const blob = new Blob(voiceChunks, { type: 'audio/webm' })
      const fd = new FormData()
      fd.append('audio', blob, 'recording.webm')
      try {
        const res = await fetch('/api/transcribe', { method: 'POST', body: fd })
        const data = await res.json()
        if (data.text) {
          voiceText.value += (voiceText.value ? '\n' : '') + data.text
          markTested('voice')
        }
      } catch (e) {
        voiceText.value += `\n⚠️ 转写失败: ${e.message}`
      }
      // If still recording, start next segment
      if (voiceRecording.value && voiceMediaRecorder) {
        voiceChunks = []
        voiceMediaRecorder.start()
        setTimeout(() => {
          if (voiceRecording.value && voiceMediaRecorder?.state === 'recording') voiceMediaRecorder.stop()
        }, 3000)
      }
    }

    voiceMediaRecorder.start()
    voiceRecording.value = true
    // Stop first segment after 3s to send for transcription
    setTimeout(() => {
      if (voiceRecording.value && voiceMediaRecorder?.state === 'recording') voiceMediaRecorder.stop()
    }, 3000)
  } catch (e) {
    voiceText.value = `⚠️ 无法访问麦克风: ${e.message}`
  }
}

function stopVoice() {
  voiceRecording.value = false
  if (voiceMediaRecorder?.state === 'recording') voiceMediaRecorder.stop()
  voiceMediaRecorder = null
  if (voiceStream) { voiceStream.getTracks().forEach(t => t.stop()); voiceStream = null }
}

// ── Structured Output ──
const structuredInput = ref('')
const structuredFormat = ref('json')
const structuredResult = ref('')
const structuredLoading = ref(false)

const formatPrompts = {
  json: 'Extract all key information from the following text and return as a JSON object. Text: ',
  summary: 'Summarize the following text in 2-3 sentences. Text: ',
  entities: 'Extract all named entities (people, places, organizations, dates) from the following text. Return as a list. Text: ',
  sentiment: 'Analyze the sentiment of the following text. Return the overall sentiment (positive/negative/neutral) with confidence score and key phrases. Text: '
}

async function runStructured() {
  if (!structuredInput.value.trim() || structuredLoading.value) return
  structuredLoading.value = true
  structuredResult.value = ''

  const prompt = formatPrompts[structuredFormat.value] + structuredInput.value
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: prompt })
    })
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      for (const line of decoder.decode(value).split('\n')) {
        if (!line.startsWith('data: ') || line.includes('[DONE]')) continue
        try {
          const data = JSON.parse(line.slice(6))
          structuredResult.value += data.content || data.text || ''
        } catch {}
      }
    }
    markTested('structured')
  } catch (e) {
    structuredResult.value = `错误: ${e.message}`
  }
  structuredLoading.value = false
}

function markTested(id) {
  const ex = examples.value.find(e => e.id === id)
  if (ex) ex.tested = true
}

// ── TTS ──
const ttsInput = ref('')
const ttsLoading = ref(false)
const ttsAudioUrl = ref(null)
const ttsLatency = ref(null)

async function runTts() {
  if (!ttsInput.value.trim() || ttsLoading.value) return
  ttsLoading.value = true
  ttsAudioUrl.value = null
  ttsLatency.value = null
  const t0 = Date.now()
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: ttsInput.value })
    })
    const blob = await res.blob()
    ttsLatency.value = Date.now() - t0
    if (ttsAudioUrl.value) URL.revokeObjectURL(ttsAudioUrl.value)
    ttsAudioUrl.value = URL.createObjectURL(blob)
    markTested('tts')
  } catch (e) {
    ttsLatency.value = Date.now() - t0
  }
  ttsLoading.value = false
}

// ── Parlor 语音对话 ──
const parlorHistory = ref([])
const parlorRecording = ref(false)
const parlorTranscribing = ref(false)
const parlorStatus = ref('')
const parlorEl = ref(null)
let parlorWs = null
let parlorRecorder = null
let parlorStream = null
let parlorAudioQueue = []
let parlorPlaying = false

function scrollParlor() {
  if (parlorEl.value) parlorEl.value.scrollTop = parlorEl.value.scrollHeight
}

function ensureParlorWs() {
  if (parlorWs && parlorWs.readyState === WebSocket.OPEN) return
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
  parlorWs = new WebSocket(`${proto}//${location.host}`)
  parlorWs.onopen = () => { parlorStatus.value = '已连接' }
  parlorWs.onclose = () => { parlorStatus.value = '已断开' }
  parlorWs.onerror = () => { parlorStatus.value = '连接错误' }
  parlorWs.onmessage = async (e) => {
    try {
      const msg = JSON.parse(e.data)
      if (msg.type === 'transcription' || msg.transcription) {
        const text = msg.transcription || msg.text
        if (text) {
          parlorHistory.value.push({ role: 'user', content: text })
          parlorTranscribing.value = false
          await nextTick(); scrollParlor()
        }
      } else if (msg.type === 'audio_chunk') {
        const audioData = msg.audio || msg.data
        const text = msg.text || ''
        if (text) {
          const last = parlorHistory.value[parlorHistory.value.length - 1]
          if (last && last.role === 'assistant' && last._streaming) {
            last.content += text
          } else {
            parlorHistory.value.push({ role: 'assistant', content: text, audioUrl: null, _streaming: true })
          }
          await nextTick(); scrollParlor()
        }
        if (audioData) {
          const blob = base64ToBlob(audioData, 'audio/mp3')
          const url = URL.createObjectURL(blob)
          const last = parlorHistory.value[parlorHistory.value.length - 1]
          if (last && last.role === 'assistant') last.audioUrl = url
          parlorAudioQueue.push(url)
          drainParlorAudio()
        }
      } else if (msg.type === 'voice_stream_end') {
        parlorTranscribing.value = false
        const last = parlorHistory.value[parlorHistory.value.length - 1]
        if (last && last._streaming) delete last._streaming
        if (!msg.skipped) markTested('parlor')
      } else if (msg.type === 'error') {
        parlorTranscribing.value = false
        parlorHistory.value.push({ role: 'assistant', content: `⚠️ ${msg.error}` })
        await nextTick(); scrollParlor()
      }
    } catch {}
  }
}

function base64ToBlob(b64, mime) {
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

async function drainParlorAudio() {
  if (parlorPlaying || !parlorAudioQueue.length) return
  parlorPlaying = true
  while (parlorAudioQueue.length) {
    const url = parlorAudioQueue.shift()
    await new Promise(resolve => {
      const a = new Audio(url)
      a.onended = resolve
      a.onerror = resolve
      a.play().catch(resolve)
    })
  }
  parlorPlaying = false
}

function playAudio(url) {
  new Audio(url).play().catch(() => {})
}

async function parlorStartRec() {
  ensureParlorWs()
  try {
    parlorStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    parlorRecorder = new MediaRecorder(parlorStream, { mimeType: 'audio/webm;codecs=opus' })
    const chunks = []
    parlorRecorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
    parlorRecorder.onstop = async () => {
      const blob = new Blob(chunks, { type: 'audio/webm' })
      const reader = new FileReader()
      reader.onloadend = () => {
        const b64 = reader.result.split(',')[1]
        parlorTranscribing.value = true
        if (parlorWs && parlorWs.readyState === WebSocket.OPEN) {
          parlorWs.send(JSON.stringify({
            type: 'voice_stream',
            audio: b64,
            history: parlorHistory.value.map(m => ({ role: m.role, content: m.content }))
          }))
        }
      }
      reader.readAsDataURL(blob)
      parlorStream?.getTracks().forEach(t => t.stop())
      parlorStream = null
    }
    parlorRecorder.start()
    parlorRecording.value = true
    parlorStatus.value = '录音中...'
  } catch (e) {
    parlorStatus.value = '麦克风错误'
  }
}

function parlorStopRec() {
  parlorRecording.value = false
  parlorStatus.value = ''
  if (parlorRecorder && parlorRecorder.state === 'recording') parlorRecorder.stop()
}

function closeParlorWs() {
  if (parlorWs) { parlorWs.close(); parlorWs = null }
  if (parlorStream) { parlorStream.getTracks().forEach(t => t.stop()); parlorStream = null }
  parlorRecording.value = false
  parlorAudioQueue = []
  parlorPlaying = false
}

// ── Live Vision ──
const lvVideoEl = ref(null)
const lvCanvasEl = ref(null)
const lvLogEl = ref(null)
const lvRunning = ref(false)
const lvEntries = ref([])
let lvStream = null
let lvInterval = null

async function toggleLiveVision() {
  if (lvRunning.value) {
    stopLiveVision()
  } else {
    try {
      lvStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      await nextTick()
      if (lvVideoEl.value) lvVideoEl.value.srcObject = lvStream
      lvRunning.value = true
      lvLoop()
    } catch (e) {
      console.error('Camera error:', e)
    }
  }
}

function stopLiveVision() {
  lvRunning.value = false
  if (lvInterval) { clearTimeout(lvInterval); lvInterval = null }
  if (lvStream) { lvStream.getTracks().forEach(t => t.stop()); lvStream = null }
}

async function lvLoop() {
  if (!lvRunning.value) return
  await captureAndDescribe()
  if (lvRunning.value) {
    lvInterval = setTimeout(lvLoop, 3000)
  }
}

async function captureAndDescribe() {
  if (!lvVideoEl.value || !lvCanvasEl.value) return
  const v = lvVideoEl.value
  const c = lvCanvasEl.value
  // Downscale to max 640px wide for faster vision processing
  const maxW = 640
  const scale = v.videoWidth > maxW ? maxW / v.videoWidth : 1
  c.width = Math.round(v.videoWidth * scale)
  c.height = Math.round(v.videoHeight * scale)
  c.getContext('2d').drawImage(v, 0, 0, c.width, c.height)
  const dataUrl = c.toDataURL('image/jpeg', 0.6)

  const now = new Date()
  const time = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`
  const entry = { time, text: '分析中...' }
  lvEntries.value.push(entry)
  await nextTick()
  if (lvLogEl.value) lvLogEl.value.scrollTop = lvLogEl.value.scrollHeight

  try {
    const res = await fetch('/api/vision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: dataUrl, prompt: '简洁描述你在这张图片中看到的内容，用一两句话概括。', fast: true })
    })
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    entry.text = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      for (const line of decoder.decode(value).split('\n')) {
        if (!line.startsWith('data: ') || line.includes('[DONE]')) continue
        try {
          const data = JSON.parse(line.slice(6))
          if (data.error) { entry.text = `错误: ${data.error}`; break }
          entry.text += data.text || ''
        } catch {}
      }
    }
    markTested('live-vision')
  } catch (e) {
    entry.text = `错误: ${e.message}`
  }
  await nextTick()
  if (lvLogEl.value) lvLogEl.value.scrollTop = lvLogEl.value.scrollHeight
}

// ── Translate ──
const translateInput = ref('')
const translateLang = ref('英文')
const translateOriginal = ref('')
const translateResult = ref('')
const translateLoading = ref(false)
const translateMicLoading = ref(false)
const translateAudioUrl = ref(null)

async function runTranslate() {
  const text = translateInput.value.trim()
  if (!text || translateLoading.value) return
  translateLoading.value = true
  translateOriginal.value = text
  translateResult.value = ''
  translateAudioUrl.value = null

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `翻译成${translateLang.value}：${text}` })
    })
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      for (const line of decoder.decode(value).split('\n')) {
        if (!line.startsWith('data: ') || line.includes('[DONE]')) continue
        try {
          const data = JSON.parse(line.slice(6))
          translateResult.value += data.content || data.text || ''
        } catch {}
      }
    }
    markTested('translate')
    // auto TTS the result
    if (translateResult.value) {
      try {
        const ttsRes = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: translateResult.value })
        })
        const blob = await ttsRes.blob()
        if (translateAudioUrl.value) URL.revokeObjectURL(translateAudioUrl.value)
        translateAudioUrl.value = URL.createObjectURL(blob)
      } catch {}
    }
  } catch (e) {
    translateResult.value = `错误: ${e.message}`
  }
  translateLoading.value = false
}

async function translateFromMic() {
  if (translateMicLoading.value) return
  translateMicLoading.value = true
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
    const chunks = []
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }

    // Record for 5 seconds then auto-stop
    await new Promise(resolve => {
      recorder.onstop = resolve
      recorder.start()
      setTimeout(() => { if (recorder.state === 'recording') recorder.stop() }, 5000)
    })
    stream.getTracks().forEach(t => t.stop())

    const blob = new Blob(chunks, { type: 'audio/webm' })
    const fd = new FormData()
    fd.append('audio', blob, 'recording.webm')
    const res = await fetch('/api/transcribe', { method: 'POST', body: fd })
    const data = await res.json()
    translateInput.value = data.text || data.transcription || ''
  } catch (e) {
    console.error('Mic error:', e)
  }
  translateMicLoading.value = false
}

// ── Doc QA ──
const docqaDoc = ref('')
const docqaQuestion = ref('')
const docqaResult = ref('')
const docqaLoading = ref(false)

async function runDocQa() {
  if (!docqaDoc.value.trim() || !docqaQuestion.value.trim() || docqaLoading.value) return
  docqaLoading.value = true
  docqaResult.value = ''

  const prompt = `基于以下文档回答问题：\n\n文档：${docqaDoc.value}\n\n问题：${docqaQuestion.value}`
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: prompt })
    })
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      for (const line of decoder.decode(value).split('\n')) {
        if (!line.startsWith('data: ') || line.includes('[DONE]')) continue
        try {
          const data = JSON.parse(line.slice(6))
          docqaResult.value += data.content || data.text || ''
        } catch {}
      }
    }
    markTested('doc-qa')
  } catch (e) {
    docqaResult.value = `错误: ${e.message}`
  }
  docqaLoading.value = false
}

// ── Dictation 连续听写 ──
const dictRecording = ref(false)
const dictText = ref('')
const dictDuration = ref(0)
let dictRecorder = null
let dictStream = null
let dictInterval = null
let dictStartTime = 0
let dictTimerInterval = null

function toggleDictation() {
  if (dictRecording.value) stopDictation()
  else startDictation()
}

async function startDictation() {
  try {
    dictStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    dictRecorder = new MediaRecorder(dictStream, { mimeType: 'audio/webm;codecs=opus' })
    dictRecording.value = true
    dictStartTime = Date.now()
    dictTimerInterval = setInterval(() => { dictDuration.value = Math.floor((Date.now() - dictStartTime) / 1000) }, 500)

    let chunks = []
    dictRecorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
    dictRecorder.onstop = async () => {
      const blob = new Blob(chunks, { type: 'audio/webm' })
      chunks = []
      if (blob.size < 100) return
      try {
        const fd = new FormData()
        fd.append('audio', blob, 'chunk.webm')
        const res = await fetch('/api/transcribe', { method: 'POST', body: fd })
        const data = await res.json()
        const text = data.text || data.transcription || ''
        if (text) { dictText.value += text; markTested('dictation') }
      } catch {}
      // restart if still recording
      if (dictRecording.value && dictRecorder && dictStream) {
        chunks = []
        dictRecorder.start()
        setTimeout(() => { if (dictRecorder && dictRecorder.state === 'recording') dictRecorder.stop() }, 3000)
      }
    }
    dictRecorder.start()
    setTimeout(() => { if (dictRecorder && dictRecorder.state === 'recording') dictRecorder.stop() }, 3000)
  } catch (e) {
    dictText.value = `麦克风错误: ${e.message}`
    dictRecording.value = false
  }
}

function stopDictation() {
  dictRecording.value = false
  if (dictTimerInterval) { clearInterval(dictTimerInterval); dictTimerInterval = null }
  if (dictRecorder && dictRecorder.state === 'recording') dictRecorder.stop()
  if (dictStream) { dictStream.getTracks().forEach(t => t.stop()); dictStream = null }
  dictRecorder = null
}

function copyDictation() {
  navigator.clipboard.writeText(dictText.value).catch(() => {})
}

// ── Vision Chat 看图聊天 ──
const vcImage = ref('')
const vcHistory = ref([])
const vcInput = ref('')
const vcLoading = ref(false)
const vcChatEl = ref(null)

function resizeImage(dataUrl, maxWidth = 1024) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      if (img.width <= maxWidth) return resolve(dataUrl)
      const canvas = document.createElement('canvas')
      const scale = maxWidth / img.width
      canvas.width = maxWidth
      canvas.height = img.height * scale
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.7))
    }
    img.src = dataUrl
  })
}

function handleVcFile(e) {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = async () => { vcImage.value = await resizeImage(reader.result); vcHistory.value = [] }
  reader.readAsDataURL(file)
}

function handleVcDrop(e) {
  const file = e.dataTransfer.files[0]
  if (!file || !file.type.startsWith('image/')) return
  const reader = new FileReader()
  reader.onload = async () => { vcImage.value = await resizeImage(reader.result); vcHistory.value = [] }
  reader.readAsDataURL(file)
}

async function sendVcChat() {
  const prompt = vcInput.value.trim()
  if (!prompt || !vcImage.value || vcLoading.value) return
  vcHistory.value.push({ role: 'user', content: prompt })
  vcInput.value = ''
  vcLoading.value = true
  vcHistory.value.push({ role: 'assistant', content: '' })
  await nextTick()
  if (vcChatEl.value) vcChatEl.value.scrollTop = vcChatEl.value.scrollHeight

  try {
    const res = await fetch('/api/vision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: vcImage.value, prompt })
    })
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    const last = vcHistory.value[vcHistory.value.length - 1]
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      for (const line of decoder.decode(value).split('\n')) {
        if (!line.startsWith('data: ') || line.includes('[DONE]')) continue
        try {
          const data = JSON.parse(line.slice(6))
          if (data.error) { last.content = `错误: ${data.error}`; break }
          last.content += data.text || ''
        } catch {}
      }
      await nextTick()
      if (vcChatEl.value) vcChatEl.value.scrollTop = vcChatEl.value.scrollHeight
    }
    markTested('vision-chat')
  } catch (e) {
    vcHistory.value[vcHistory.value.length - 1].content = `错误: ${e.message}`
  }
  vcLoading.value = false
}

// ── Vision Voice 看图说话 ──
const vvImage = ref('')
const vvSource = ref('upload')
const vvDescription = ref('')
const vvAudioUrl = ref(null)
const vvLoading = ref(false)
const vvVideoEl = ref(null)
let vvCameraStream = null

function handleVvFile(e) {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => { vvImage.value = reader.result; vvDescription.value = ''; vvAudioUrl.value = null }
  reader.readAsDataURL(file)
}

function handleVvDrop(e) {
  const file = e.dataTransfer.files[0]
  if (!file || !file.type.startsWith('image/')) return
  const reader = new FileReader()
  reader.onload = () => { vvImage.value = reader.result; vvDescription.value = ''; vvAudioUrl.value = null }
  reader.readAsDataURL(file)
}

async function startVvCamera() {
  vvSource.value = 'camera'
  try {
    vvCameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    await nextTick()
    if (vvVideoEl.value) vvVideoEl.value.srcObject = vvCameraStream
  } catch {}
}

function stopVvCamera() {
  if (vvCameraStream) { vvCameraStream.getTracks().forEach(t => t.stop()); vvCameraStream = null }
}

function captureVvPhoto() {
  if (!vvVideoEl.value) return
  const canvas = document.createElement('canvas')
  canvas.width = vvVideoEl.value.videoWidth
  canvas.height = vvVideoEl.value.videoHeight
  canvas.getContext('2d').drawImage(vvVideoEl.value, 0, 0)
  vvImage.value = canvas.toDataURL('image/jpeg', 0.85)
  vvDescription.value = ''
  vvAudioUrl.value = null
  stopVvCamera()
  vvSource.value = 'upload'
}

async function runVisionVoice() {
  if (!vvImage.value || vvLoading.value) return
  vvLoading.value = true
  vvDescription.value = ''
  vvAudioUrl.value = null

  try {
    // Step 1: get description
    const res = await fetch('/api/vision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: vvImage.value, prompt: '详细描述这张图片' })
    })
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      for (const line of decoder.decode(value).split('\n')) {
        if (!line.startsWith('data: ') || line.includes('[DONE]')) continue
        try {
          const data = JSON.parse(line.slice(6))
          vvDescription.value += data.text || ''
        } catch {}
      }
    }
    // Step 2: TTS
    if (vvDescription.value) {
      const ttsRes = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: vvDescription.value })
      })
      const blob = await ttsRes.blob()
      if (vvAudioUrl.value) URL.revokeObjectURL(vvAudioUrl.value)
      vvAudioUrl.value = URL.createObjectURL(blob)
    }
    markTested('vision-voice')
  } catch (e) {
    vvDescription.value = `错误: ${e.message}`
  }
  vvLoading.value = false
}

// ── Voice Note 语音笔记 ──
const vnRecording = ref(false)
const vnTranscript = ref('')
const vnNote = ref('')
const vnStatus = ref('')
let vnRecorder = null
let vnStream = null

async function toggleVoiceNote() {
  if (vnRecording.value) {
    vnRecording.value = false
    vnStatus.value = '处理中...'
    if (vnRecorder && vnRecorder.state === 'recording') vnRecorder.stop()
  } else {
    vnTranscript.value = ''
    vnNote.value = ''
    vnStatus.value = '录音中...'
    try {
      vnStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      vnRecorder = new MediaRecorder(vnStream, { mimeType: 'audio/webm;codecs=opus' })
      const chunks = []
      vnRecorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
      vnRecorder.onstop = async () => {
        vnStream?.getTracks().forEach(t => t.stop())
        vnStream = null
        const blob = new Blob(chunks, { type: 'audio/webm' })
        // Step 1: transcribe
        vnStatus.value = '转写中...'
        try {
          const fd = new FormData()
          fd.append('audio', blob, 'note.webm')
          const res = await fetch('/api/transcribe', { method: 'POST', body: fd })
          const data = await res.json()
          vnTranscript.value = data.text || data.transcription || ''
          if (!vnTranscript.value) { vnStatus.value = '未识别到语音'; return }
          // Step 2: organize with AI
          vnStatus.value = 'AI 整理中...'
          const chatRes = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: '把以下语音内容整理成结构化笔记，包含要点、待办事项、关键决策：\n\n' + vnTranscript.value })
          })
          const reader = chatRes.body.getReader()
          const decoder = new TextDecoder()
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            for (const line of decoder.decode(value).split('\n')) {
              if (!line.startsWith('data: ') || line.includes('[DONE]')) continue
              try {
                const d = JSON.parse(line.slice(6))
                vnNote.value += d.content || d.text || ''
              } catch {}
            }
          }
          vnStatus.value = ''
          markTested('voice-note')
        } catch (e) {
          vnStatus.value = `错误: ${e.message}`
        }
      }
      vnRecorder.start()
      vnRecording.value = true
    } catch (e) {
      vnStatus.value = `麦克风错误: ${e.message}`
    }
  }
}

// ── Subtitle 实时字幕 ──
const subRecording = ref(false)
const subCurrent = ref('')
const subHistory = ref([])
const subtitleSize = ref('medium')
const subHistoryEl = ref(null)
let subRecorder = null
let subStream = null

function toggleSubtitle() {
  if (subRecording.value) stopSubtitle()
  else startSubtitle()
}

async function startSubtitle() {
  try {
    subStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    subRecorder = new MediaRecorder(subStream, { mimeType: 'audio/webm;codecs=opus' })
    subRecording.value = true

    let chunks = []
    subRecorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
    subRecorder.onstop = async () => {
      const blob = new Blob(chunks, { type: 'audio/webm' })
      chunks = []
      if (blob.size < 100) { if (subRecording.value) restartSubRecorder(); return }
      try {
        const fd = new FormData()
        fd.append('audio', blob, 'sub.webm')
        const res = await fetch('/api/transcribe', { method: 'POST', body: fd })
        const data = await res.json()
        const text = data.text || data.transcription || ''
        if (text) {
          if (subCurrent.value) subHistory.value.push(subCurrent.value)
          subCurrent.value = text
          markTested('subtitle')
          await nextTick()
          if (subHistoryEl.value) subHistoryEl.value.scrollTop = subHistoryEl.value.scrollHeight
        }
      } catch {}
      if (subRecording.value) restartSubRecorder()
    }
    subRecorder.start()
    setTimeout(() => { if (subRecorder && subRecorder.state === 'recording') subRecorder.stop() }, 2000)
  } catch (e) {
    subCurrent.value = `麦克风错误: ${e.message}`
    subRecording.value = false
  }
}

function restartSubRecorder() {
  if (!subRecorder || !subStream) return
  try {
    subRecorder.start()
    setTimeout(() => { if (subRecorder && subRecorder.state === 'recording') subRecorder.stop() }, 2000)
  } catch {}
}

function stopSubtitle() {
  subRecording.value = false
  if (subRecorder && subRecorder.state === 'recording') subRecorder.stop()
  if (subStream) { subStream.getTracks().forEach(t => t.stop()); subStream = null }
  subRecorder = null
}

// ── Storyteller 故事讲述 ──
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
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `请根据以下主题写一个有趣的短故事（300-500字）：${storyTopic.value}` })
    })
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      for (const line of decoder.decode(value).split('\n')) {
        if (!line.startsWith('data: ') || line.includes('[DONE]')) continue
        try {
          const data = JSON.parse(line.slice(6))
          storyText.value += data.content || data.text || ''
        } catch {}
      }
    }
    storyDone.value = true
    markTested('storyteller')
  } catch (e) {
    storyText.value = `错误: ${e.message}`
  }
  storyLoading.value = false
}

async function playStory() {
  if (!storyText.value || storyTtsLoading.value) return
  storyTtsLoading.value = true
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: storyText.value })
    })
    const blob = await res.blob()
    if (storyAudioUrl.value) URL.revokeObjectURL(storyAudioUrl.value)
    storyAudioUrl.value = URL.createObjectURL(blob)
  } catch {}
  storyTtsLoading.value = false
}

// ── Multimodal 多模态对话 ──
const mmHistory = ref([])
const mmInput = ref('')
const mmLoading = ref(false)
const mmRecording = ref(false)
const mmChatEl = ref(null)

async function scrollMm() {
  await nextTick()
  if (mmChatEl.value) mmChatEl.value.scrollTop = mmChatEl.value.scrollHeight
}

async function sendMmText() {
  const msg = mmInput.value.trim()
  if (!msg || mmLoading.value) return
  mmHistory.value.push({ role: 'user', content: msg })
  mmInput.value = ''
  mmLoading.value = true
  mmHistory.value.push({ role: 'assistant', content: '' })
  await scrollMm()

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, history: mmHistory.value.slice(0, -1).map(m => ({ role: m.role, content: m.content })) })
    })
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    const last = mmHistory.value[mmHistory.value.length - 1]
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      for (const line of decoder.decode(value).split('\n')) {
        if (!line.startsWith('data: ') || line.includes('[DONE]')) continue
        try {
          const data = JSON.parse(line.slice(6))
          last.content += data.content || data.text || ''
        } catch {}
      }
      await scrollMm()
    }
    markTested('multimodal')
  } catch (e) {
    mmHistory.value[mmHistory.value.length - 1].content = `错误: ${e.message}`
  }
  mmLoading.value = false
}

async function sendMmImage(e) {
  const file = e.target.files[0]
  if (!file || mmLoading.value) return
  const reader = new FileReader()
  reader.onload = async () => {
    const base64 = reader.result
    mmHistory.value.push({ role: 'user', content: '(发送了图片)', image: base64 })
    mmLoading.value = true
    mmHistory.value.push({ role: 'assistant', content: '' })
    await scrollMm()

    try {
      const res = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64,
          prompt: '描述这张图片',
          history: mmHistory.value.slice(0, -2).filter(m => !m.image).map(m => ({ role: m.role, content: m.content }))
        })
      })
      const r = res.body.getReader()
      const decoder = new TextDecoder()
      const last = mmHistory.value[mmHistory.value.length - 1]
      while (true) {
        const { done, value } = await r.read()
        if (done) break
        for (const line of decoder.decode(value).split('\n')) {
          if (!line.startsWith('data: ') || line.includes('[DONE]')) continue
          try {
            const data = JSON.parse(line.slice(6))
            last.content += data.text || ''
          } catch {}
        }
        await scrollMm()
      }
      markTested('multimodal')
    } catch (err) {
      mmHistory.value[mmHistory.value.length - 1].content = `错误: ${err.message}`
    }
    mmLoading.value = false
  }
  reader.readAsDataURL(file)
  e.target.value = ''
}

async function sendMmVoice() {
  if (mmRecording.value || mmLoading.value) return
  mmRecording.value = true
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
    const chunks = []
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
    await new Promise(resolve => {
      recorder.onstop = resolve
      recorder.start()
      setTimeout(() => { if (recorder.state === 'recording') recorder.stop() }, 5000)
    })
    stream.getTracks().forEach(t => t.stop())
    mmRecording.value = false

    const blob = new Blob(chunks, { type: 'audio/webm' })
    const fd = new FormData()
    fd.append('audio', blob, 'voice.webm')
    const res = await fetch('/api/transcribe', { method: 'POST', body: fd })
    const data = await res.json()
    const text = data.text || data.transcription || ''
    if (text) {
      mmInput.value = text
      await sendMmText()
    }
  } catch {
    mmRecording.value = false
  }
}

async function mmTtsPlay(text) {
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    new Audio(url).play().catch(() => {})
  } catch {}
}

// ── Annotate 图片批注 ──
const annImage = ref('')
const annResult = ref('')
const annLoading = ref(false)

function handleAnnFile(e) {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => { annImage.value = reader.result; annResult.value = '' }
  reader.readAsDataURL(file)
}

function handleAnnDrop(e) {
  const file = e.dataTransfer.files[0]
  if (!file || !file.type.startsWith('image/')) return
  const reader = new FileReader()
  reader.onload = () => { annImage.value = reader.result; annResult.value = '' }
  reader.readAsDataURL(file)
}

async function runAnnotate() {
  if (!annImage.value || annLoading.value) return
  annLoading.value = true
  annResult.value = ''

  try {
    const res = await fetch('/api/vision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: annImage.value, prompt: '详细描述图片中每个区域的内容，用编号列出' })
    })
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      for (const line of decoder.decode(value).split('\n')) {
        if (!line.startsWith('data: ') || line.includes('[DONE]')) continue
        try {
          const data = JSON.parse(line.slice(6))
          if (data.error) { annResult.value = `错误: ${data.error}`; break }
          annResult.value += data.text || ''
        } catch {}
      }
    }
    markTested('annotate')
  } catch (e) {
    annResult.value = `错误: ${e.message}`
  }
  annLoading.value = false
}

// ── API Compat ──
const compatTab = ref('openai')
const compatOpenaiBody = ref(JSON.stringify({ model: 'default', messages: [{ role: 'user', content: 'Hello' }], stream: false }, null, 2))
const compatOpenaiStream = ref(false)
const compatAnthropicBody = ref(JSON.stringify({ model: 'default', messages: [{ role: 'user', content: 'Hello' }], max_tokens: 256 }, null, 2))
const compatLoading = ref(false)
const compatResult = ref('')

async function sendCompat(provider) {
  compatLoading.value = true
  compatResult.value = ''
  try {
    const url = provider === 'openai' ? '/v1/chat/completions' : '/v1/messages'
    const body = provider === 'openai' ? compatOpenaiBody.value : compatAnthropicBody.value
    const parsed = JSON.parse(body)
    if (provider === 'openai' && compatOpenaiStream.value) parsed.stream = true
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed) })
    if (parsed.stream) {
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let out = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        out += decoder.decode(value)
      }
      compatResult.value = out
    } else {
      compatResult.value = JSON.stringify(await res.json(), null, 2)
    }
  } catch (e) {
    compatResult.value = `错误: ${e.message}`
  }
  compatLoading.value = false
}

// ── Voice Pipeline ──
const vpRecording = ref(false)
const vpLatency = ref(null)
const vpAudioUrl = ref('')
const vpError = ref('')
let vpMediaRecorder = null
let vpStream = null

async function toggleVp() {
  if (vpRecording.value) {
    vpRecording.value = false
    if (vpMediaRecorder) vpMediaRecorder.stop()
    return
  }
  vpRecording.value = true
  vpError.value = ''
  vpAudioUrl.value = ''
  vpLatency.value = null
  try {
    vpStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    vpMediaRecorder = new MediaRecorder(vpStream)
    const chunks = []
    vpMediaRecorder.ondataavailable = e => chunks.push(e.data)
    vpMediaRecorder.onstop = async () => {
      vpStream?.getTracks().forEach(t => t.stop())
      const blob = new Blob(chunks, { type: 'audio/webm' })
      const form = new FormData()
      form.append('audio', blob, 'recording.webm')
      const t0 = Date.now()
      try {
        const res = await fetch('/api/voice', { method: 'POST', body: form })
        vpLatency.value = Date.now() - t0
        const audioBlob = await res.blob()
        vpAudioUrl.value = URL.createObjectURL(audioBlob)
      } catch (e) {
        vpError.value = e.message
      }
    }
    vpMediaRecorder.start()
  } catch (e) {
    vpError.value = e.message
    vpRecording.value = false
  }
}

// ── Function Calling ──
const fcTools = ref([
  { name: 'get_weather', description: '获取天气', parameters: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] } },
  { name: 'calculate', description: '数学计算', parameters: { type: 'object', properties: { expression: { type: 'string' } }, required: ['expression'] } },
  { name: 'search_web', description: '搜索网页', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
])
const fcInput = ref('')
const fcResult = ref('')
const fcLoading = ref(false)
const fcToolCalls = ref([])

async function sendFc() {
  const msg = fcInput.value.trim()
  if (!msg || fcLoading.value) return
  fcInput.value = ''
  fcResult.value = ''
  fcToolCalls.value = []
  fcLoading.value = true
  try {
    const tools = fcTools.value.map(t => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } }))
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, tools })
    })
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let text = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      for (const line of decoder.decode(value).split('\n')) {
        if (!line.startsWith('data: ') || line.includes('[DONE]')) continue
        try {
          const d = JSON.parse(line.slice(6))
          const delta = d.choices?.[0]?.delta
          if (delta?.content) text += delta.content
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              if (tc.function?.name) fcToolCalls.value.push({ name: tc.function.name, args: tc.function.arguments || '' })
            }
          }
        } catch {}
      }
    }
    fcResult.value = text || (fcToolCalls.value.length ? '(AI 调用了工具)' : '(无响应)')
  } catch (e) {
    fcResult.value = `错误: ${e.message}`
  }
  fcLoading.value = false
}

// ── Perf 性能监控 ──
const perfData = ref(null)
const perfLoading = ref(false)
const perfError = ref('')
const perfAuto = ref(false)
const perfMaxMs = ref(1000)
let perfTimer = null

async function fetchPerf() {
  perfLoading.value = true
  perfError.value = ''
  try {
    const res = await fetch('/api/perf')
    perfData.value = await res.json()
    const maxVal = Math.max(...Object.values(perfData.value).map(m => m.avg_ms || 0), 100)
    perfMaxMs.value = maxVal
  } catch (e) {
    perfError.value = e.message
  }
  perfLoading.value = false
}

function togglePerfAuto() {
  if (perfAuto.value) {
    fetchPerf()
    perfTimer = setInterval(fetchPerf, 3000)
  } else {
    clearInterval(perfTimer)
  }
}

// ── Devices 设备管理 ──
const devicesList = ref([])
const devicesLoading = ref(false)
const devicesError = ref('')

async function fetchDevices() {
  devicesLoading.value = true
  devicesError.value = ''
  try {
    const res = await fetch('/api/devices')
    devicesList.value = await res.json()
  } catch (e) {
    devicesError.value = e.message
  }
  devicesLoading.value = false
}

// ── Logs 系统日志 ──
const logsList = ref([])
const logsLoading = ref(false)
const logsError = ref('')
const logsAuto = ref(false)
let logsTimer = null

async function fetchLogs() {
  logsLoading.value = true
  logsError.value = ''
  try {
    const res = await fetch('/api/logs')
    logsList.value = await res.json()
  } catch (e) {
    logsError.value = e.message
  }
  logsLoading.value = false
}

function toggleLogsAuto() {
  if (logsAuto.value) {
    fetchLogs()
    logsTimer = setInterval(fetchLogs, 5000)
  } else {
    clearInterval(logsTimer)
  }
}


onUnmounted(() => {
  stopCamera(); stopVoice(); closeParlorWs(); stopLiveVision(); stopDictation(); stopVvCamera(); stopSubtitle()
  clearInterval(perfTimer); clearInterval(logsTimer)
})
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

/* Chat */
.chat-panel { display: flex; flex-direction: column; height: 500px; }
.chat-messages {
  flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px;
  background: var(--surface-2, #1e293b); border-radius: 10px;
}
.chat-msg { display: flex; }
.chat-msg.user { justify-content: flex-end; }
.msg-bubble {
  max-width: 75%; padding: 10px 14px; border-radius: 14px; font-size: 14px;
  line-height: 1.5; white-space: pre-wrap; word-break: break-word;
}
.chat-msg.user .msg-bubble { background: var(--accent, #3b82f6); color: white; }
.chat-msg.assistant .msg-bubble { background: var(--surface-3, #374151); }
.msg-bubble.loading { opacity: 0.6; }
.typing-dots span {
  animation: blink 1.4s infinite both;
  font-size: 20px; letter-spacing: 2px; line-height: 1;
}
.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes blink { 0%, 80%, 100% { opacity: 0.2; } 40% { opacity: 1; } }
.chat-input-row {
  display: flex; gap: 8px; margin-top: 12px;
}
.chat-input-row input {
  flex: 1; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border, #334155);
  background: var(--surface-2, #1e293b); color: var(--text); font-size: 14px;
}
.chat-input-row button {
  padding: 10px 20px; border-radius: 8px; border: none;
  background: var(--accent, #3b82f6); color: white; cursor: pointer; font-size: 14px;
}
.chat-input-row button:disabled { opacity: 0.5; cursor: not-allowed; }

/* Vision */
.vision-panel { display: flex; flex-direction: column; gap: 16px; }
.vision-source-tabs { display: flex; gap: 8px; margin-bottom: 8px; }
.vision-source-tabs button {
  padding: 8px 16px; border-radius: 8px; border: 1px solid var(--border, #334155);
  background: var(--surface-2, #1e293b); color: var(--text); cursor: pointer; font-size: 13px;
}
.vision-source-tabs button.active { background: var(--accent, #3b82f6); color: white; border-color: var(--accent); }

.upload-area {
  border: 2px dashed var(--border, #334155); border-radius: 12px; padding: 40px;
  text-align: center; cursor: pointer; transition: border-color 0.2s;
  min-height: 200px; display: flex; align-items: center; justify-content: center;
}
.upload-area:hover { border-color: var(--accent, #3b82f6); }
.upload-placeholder { display: flex; flex-direction: column; align-items: center; gap: 12px; color: var(--text-dim); }
.upload-icon { font-size: 48px; }
.preview-img { max-width: 100%; max-height: 400px; border-radius: 8px; object-fit: contain; }

.camera-area { position: relative; border-radius: 12px; overflow: hidden; background: #000; }
.camera-video { width: 100%; max-height: 400px; display: block; }
.btn-capture {
  position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%);
  padding: 10px 24px; border-radius: 24px; border: none;
  background: rgba(255,255,255,0.9); color: #000; font-size: 14px; cursor: pointer;
}

.vision-prompt-row { display: flex; gap: 8px; }
.vision-prompt-row input {
  flex: 1; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border, #334155);
  background: var(--surface-2, #1e293b); color: var(--text); font-size: 14px;
}
.vision-prompt-row button {
  padding: 10px 20px; border-radius: 8px; border: none;
  background: var(--accent, #3b82f6); color: white; cursor: pointer; font-size: 14px; white-space: nowrap;
}
.vision-prompt-row button:disabled { opacity: 0.5; cursor: not-allowed; }

/* Voice */
.voice-panel { display: flex; flex-direction: column; align-items: center; gap: 24px; padding: 40px 0; }
.voice-status { text-align: center; }
.voice-indicator { position: relative; display: inline-block; margin-bottom: 12px; }
.voice-icon { font-size: 48px; position: relative; z-index: 1; }
.pulse-ring {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: 80px; height: 80px; border-radius: 50%; border: 2px solid #ef4444;
  animation: pulse 1.5s ease-out infinite;
}
@keyframes pulse {
  0% { transform: translate(-50%, -50%) scale(0.8); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1.4); opacity: 0; }
}
.voice-state { font-size: 15px; color: var(--text-dim); }
.btn-voice {
  padding: 14px 32px; border-radius: 12px; border: none; font-size: 16px;
  background: var(--accent, #3b82f6); color: white; cursor: pointer;
}
.btn-voice.active { background: #ef4444; }

/* Structured */
.structured-panel { display: flex; flex-direction: column; gap: 16px; }
.structured-controls { display: flex; flex-direction: column; gap: 12px; }
.structured-controls textarea {
  width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border, #334155);
  background: var(--surface-2, #1e293b); color: var(--text); font-size: 14px;
  resize: vertical; font-family: inherit;
}
.structured-format { display: flex; align-items: center; gap: 8px; }
.structured-format label { font-size: 13px; color: var(--text-dim); }
.structured-format select {
  padding: 6px 12px; border-radius: 6px; border: 1px solid var(--border, #334155);
  background: var(--surface-2, #1e293b); color: var(--text); font-size: 13px;
}
.structured-controls button {
  align-self: flex-start; padding: 10px 24px; border-radius: 8px; border: none;
  background: var(--accent, #3b82f6); color: white; cursor: pointer; font-size: 14px;
}
.structured-controls button:disabled { opacity: 0.5; cursor: not-allowed; }

/* Shared result styles */
.vision-result, .voice-result, .structured-result {
  background: var(--surface-2, #1e293b); border-radius: 10px; padding: 16px;
}
.result-label { font-size: 12px; color: var(--text-dim); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
.result-text { font-size: 14px; line-height: 1.6; white-space: pre-wrap; }
.result-code { font-size: 13px; line-height: 1.5; white-space: pre-wrap; font-family: 'SF Mono', monospace; margin: 0; }

.voice-info { text-align: center; }
.voice-info p { font-size: 13px; color: var(--text-dim); margin: 4px 0; }
.voice-warning { color: #f59e0b; }

/* TTS */
.tts-panel { display: flex; flex-direction: column; gap: 16px; }
.tts-controls { display: flex; flex-direction: column; gap: 12px; }
.tts-controls textarea {
  width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border, #334155);
  background: var(--surface-2, #1e293b); color: var(--text); font-size: 14px;
  resize: vertical; font-family: inherit;
}
.tts-controls button {
  align-self: flex-start; padding: 10px 24px; border-radius: 8px; border: none;
  background: var(--accent, #3b82f6); color: white; cursor: pointer; font-size: 14px;
}
.tts-controls button:disabled { opacity: 0.5; cursor: not-allowed; }
.tts-result {
  background: var(--surface-2, #1e293b); border-radius: 10px; padding: 16px;
  display: flex; flex-direction: column; gap: 12px;
}
.tts-audio { width: 100%; }
.tts-latency { font-size: 13px; color: var(--text-dim); }

/* Parlor */
.parlor-panel { display: flex; flex-direction: column; height: 500px; }
.parlor-messages {
  flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px;
  background: var(--surface-2, #1e293b); border-radius: 10px;
}
.parlor-controls {
  display: flex; align-items: center; gap: 12px; margin-top: 12px; justify-content: center;
}
.parlor-status { font-size: 13px; color: var(--text-dim); }
.btn-play-inline {
  background: none; border: none; cursor: pointer; font-size: 14px; padding: 2px 6px;
  margin-left: 6px; border-radius: 4px; opacity: 0.7;
}
.btn-play-inline:hover { opacity: 1; background: rgba(255,255,255,0.1); }

/* Live Vision */
.live-vision-panel { display: flex; flex-direction: column; gap: 16px; }
.lv-main { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.lv-video-area { display: flex; flex-direction: column; gap: 12px; align-items: center; }
.lv-video-area .camera-video { width: 100%; border-radius: 10px; background: #000; min-height: 240px; }
.lv-log {
  background: var(--surface-2, #1e293b); border-radius: 10px; padding: 16px;
  overflow-y: auto; max-height: 400px;
}
.lv-entry { margin-bottom: 10px; font-size: 14px; line-height: 1.5; }
.lv-time { color: var(--accent, #3b82f6); font-size: 12px; margin-right: 8px; font-family: 'SF Mono', monospace; }
.lv-text { color: var(--text); }
.lv-empty { color: var(--text-dim); font-size: 14px; }

/* Translate */
.translate-panel { display: flex; flex-direction: column; gap: 16px; }
.translate-controls { display: flex; flex-direction: column; gap: 12px; }
.translate-lang-row { display: flex; align-items: center; gap: 8px; }
.translate-lang-row label { font-size: 13px; color: var(--text-dim); }
.translate-lang-row select {
  padding: 6px 12px; border-radius: 6px; border: 1px solid var(--border, #334155);
  background: var(--surface-2, #1e293b); color: var(--text); font-size: 13px;
}
.translate-input-row { display: flex; gap: 8px; }
.translate-input-row input {
  flex: 1; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border, #334155);
  background: var(--surface-2, #1e293b); color: var(--text); font-size: 14px;
}
.translate-input-row button {
  padding: 10px 20px; border-radius: 8px; border: none;
  background: var(--accent, #3b82f6); color: white; cursor: pointer; font-size: 14px; white-space: nowrap;
}
.translate-input-row button:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-mic-small { padding: 10px 14px !important; }
.translate-result {
  background: var(--surface-2, #1e293b); border-radius: 10px; padding: 16px;
  display: flex; flex-direction: column; gap: 12px;
}
.translate-row { }

/* Doc QA */
.docqa-panel { display: flex; flex-direction: column; gap: 16px; }
.docqa-controls { display: flex; flex-direction: column; gap: 12px; }
.docqa-controls textarea {
  width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border, #334155);
  background: var(--surface-2, #1e293b); color: var(--text); font-size: 14px;
  resize: vertical; font-family: inherit;
}
.docqa-question-row { display: flex; gap: 8px; }
.docqa-question-row input {
  flex: 1; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border, #334155);
  background: var(--surface-2, #1e293b); color: var(--text); font-size: 14px;
}
.docqa-question-row button {
  padding: 10px 20px; border-radius: 8px; border: none;
  background: var(--accent, #3b82f6); color: white; cursor: pointer; font-size: 14px; white-space: nowrap;
}
.docqa-question-row button:disabled { opacity: 0.5; cursor: not-allowed; }
.docqa-result {
  background: var(--surface-2, #1e293b); border-radius: 10px; padding: 16px;
}

/* Dictation 连续听写 */
.dictation-panel { display: flex; flex-direction: column; gap: 16px; }
.dictation-controls { display: flex; gap: 12px; align-items: center; }
.dictation-text {
  width: 100%; padding: 16px; border-radius: 10px; border: 1px solid var(--border, #334155);
  background: var(--surface-2, #1e293b); color: var(--text); font-size: 15px;
  resize: vertical; font-family: inherit; line-height: 1.6;
}
.dictation-footer {
  display: flex; gap: 20px; font-size: 13px; color: var(--text-dim);
}
.btn-secondary {
  padding: 10px 20px; border-radius: 8px; border: 1px solid var(--border, #334155);
  background: var(--surface-2, #1e293b); color: var(--text); cursor: pointer; font-size: 14px;
}
.btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }

/* Vision Chat 看图聊天 */
.vision-chat-panel { display: flex; flex-direction: column; gap: 16px; }
.vc-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; min-height: 400px; }
.vc-image-area {
  border: 2px dashed var(--border, #334155); border-radius: 10px; cursor: pointer;
  display: flex; align-items: center; justify-content: center; overflow: hidden;
}
.vc-image-area .preview-img { width: 100%; height: 100%; object-fit: contain; }
.vc-chat-area { display: flex; flex-direction: column; gap: 8px; }
.vc-chat-area .chat-messages { flex: 1; min-height: 300px; }

/* Vision Voice 看图说话 */
.vision-voice-panel { display: flex; flex-direction: column; gap: 16px; }
.vv-controls { display: flex; flex-direction: column; gap: 12px; }
.vv-result {
  background: var(--surface-2, #1e293b); border-radius: 10px; padding: 16px;
  display: flex; flex-direction: column; gap: 12px;
}
.btn-primary {
  padding: 10px 20px; border-radius: 8px; border: none;
  background: var(--accent, #3b82f6); color: white; cursor: pointer; font-size: 14px;
}
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

/* Voice Note 语音笔记 */
.voice-note-panel { display: flex; flex-direction: column; gap: 16px; }
.vn-controls { display: flex; gap: 12px; align-items: center; }
.vn-status { font-size: 13px; color: var(--text-dim); }
.vn-results { display: flex; flex-direction: column; gap: 16px; }
.vn-section {
  background: var(--surface-2, #1e293b); border-radius: 10px; padding: 16px;
}

/* Subtitle 实时字幕 */
.subtitle-panel { display: flex; flex-direction: column; gap: 16px; }
.subtitle-controls { display: flex; gap: 12px; align-items: center; }
.subtitle-size-btns { display: flex; gap: 4px; }
.subtitle-size-btns button {
  padding: 6px 12px; border-radius: 6px; border: 1px solid var(--border, #334155);
  background: var(--surface-2, #1e293b); color: var(--text); cursor: pointer; font-size: 13px;
}
.subtitle-size-btns button.active { background: var(--accent, #3b82f6); border-color: var(--accent, #3b82f6); }
.subtitle-display {
  background: #000; border-radius: 10px; padding: 32px; min-height: 300px;
  display: flex; flex-direction: column; justify-content: center; align-items: center;
}
.subtitle-current {
  color: #fff; text-align: center; margin-bottom: 24px; font-weight: 600;
}
.font-small .subtitle-current { font-size: 24px; }
.font-medium .subtitle-current { font-size: 36px; }
.font-large .subtitle-current { font-size: 52px; }
.subtitle-history {
  max-height: 150px; overflow-y: auto; width: 100%; text-align: center;
}
.subtitle-line { color: rgba(255,255,255,0.5); font-size: 14px; margin-bottom: 4px; }

/* Storyteller 故事讲述 */
.storyteller-panel { display: flex; flex-direction: column; gap: 16px; }
.story-controls { display: flex; gap: 8px; }
.story-controls input {
  flex: 1; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border, #334155);
  background: var(--surface-2, #1e293b); color: var(--text); font-size: 14px;
}
.story-controls button {
  padding: 10px 20px; border-radius: 8px; border: none;
  background: var(--accent, #3b82f6); color: white; cursor: pointer; font-size: 14px; white-space: nowrap;
}
.story-controls button:disabled { opacity: 0.5; cursor: not-allowed; }
.story-result {
  background: var(--surface-2, #1e293b); border-radius: 10px; padding: 16px;
  display: flex; flex-direction: column; gap: 12px;
}
.story-audio-row { display: flex; gap: 12px; align-items: center; }

/* Multimodal 多模态对话 */
.multimodal-panel { display: flex; flex-direction: column; gap: 8px; }
.multimodal-panel .chat-messages { flex: 1; min-height: 350px; }
.mm-input-row { display: flex; gap: 8px; }
.mm-input-row input {
  flex: 1; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border, #334155);
  background: var(--surface-2, #1e293b); color: var(--text); font-size: 14px;
}
.mm-input-row button {
  padding: 10px 16px; border-radius: 8px; border: none;
  background: var(--accent, #3b82f6); color: white; cursor: pointer; font-size: 14px;
}
.mm-input-row button:disabled { opacity: 0.5; cursor: not-allowed; }
.mm-msg-img { max-width: 200px; border-radius: 8px; margin-bottom: 4px; }

/* Annotate 图片批注 */
.annotate-panel { display: flex; flex-direction: column; gap: 16px; }
.ann-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; min-height: 400px; }
.ann-image-area {
  border: 2px dashed var(--border, #334155); border-radius: 10px; cursor: pointer;
  display: flex; align-items: center; justify-content: center; overflow: hidden;
}
.ann-image-area .preview-img { width: 100%; height: 100%; object-fit: contain; }
.ann-result-area {
  display: flex; flex-direction: column; gap: 12px;
  background: var(--surface-2, #1e293b); border-radius: 10px; padding: 16px;
  overflow-y: auto;
}
</style>
