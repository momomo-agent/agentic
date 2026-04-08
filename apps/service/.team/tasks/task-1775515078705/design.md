# Task Design: VAD 自动语音检测集成

## Files
- `src/ui/client/App.vue` — add VAD logic

## Algorithm
```
1. On mount: create AudioContext, getUserMedia({ audio: true })
2. Connect stream → AnalyserNode (fftSize=512)
3. requestAnimationFrame loop: compute RMS from time-domain data
4. RMS > SPEECH_THRESHOLD (0.01) for 3 consecutive frames → speechstart
5. RMS < SILENCE_THRESHOLD (0.005) for 500ms → speechend → call transcribe()
```

## State Machine
```
idle → [speechstart] → recording → [speechend] → processing → idle
```

## Key Variables
```js
const SPEECH_THRESHOLD = 0.01
const SILENCE_THRESHOLD = 0.005
const SILENCE_DURATION = 500  // ms
let silenceStart = null
let isRecording = false
let mediaRecorder = null
let chunks = []
```

## Functions
```js
startVAD(): void         // init AudioContext + analyser loop
stopVAD(): void          // disconnect, cancel animation frame
onSpeechStart(): void    // start MediaRecorder, set isRecording=true
onSpeechEnd(): void      // stop MediaRecorder, call submitAudio(blob)
submitAudio(blob): void  // POST to /api/transcribe, then send text to chat
```

## Edge Cases
- getUserMedia denied → show error, fall back to push-to-talk
- AudioContext suspended → resume on user gesture
- speechend fires before MediaRecorder has data → ignore empty blob

## Test Cases
1. RMS above threshold → isRecording becomes true
2. Silence for 500ms → transcribe called
3. getUserMedia error → push-to-talk mode active
