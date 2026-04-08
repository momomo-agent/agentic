# Task Design: 唤醒词检测

## Files
- `src/ui/client/WakeWord.vue` — 新建，浏览器端唤醒词监听组件
- `src/ui/client/App.vue` — 修改，挂载 WakeWord 组件

## WakeWord.vue

```js
// props
wakeWord: string  // 从父组件传入，来源 GET /api/config

// 函数
startListening() → void   // 启动 SpeechRecognition，continuous: true
stopListening() → void    // 停止识别
onResult(event) → void    // 检查 transcript 是否包含 wakeWord（toLowerCase）

// emit
'activated'  // 匹配到唤醒词时触发
```

## 逻辑
1. 组件 mounted → 调用 startListening()
2. SpeechRecognition.onresult → onResult()
3. transcript.toLowerCase().includes(wakeWord.toLowerCase()) → emit('activated')
4. App.vue 监听 activated → 触发 PushToTalk 开始录音

## 边界情况
- 浏览器不支持 SpeechRecognition → console.warn，静默降级（不报错）
- recognition.onerror → 自动重启（最多 3 次）
- wakeWord 为空 → 不启动监听

## 测试用例
- 说出 "hey" → activated 事件触发
- 说出其他词 → 无事件
- wakeWord 改为 "hello" → 说 "hello" 触发
- 浏览器不支持 → 无崩溃
