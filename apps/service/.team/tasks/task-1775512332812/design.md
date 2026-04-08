# 技术设计 — 实现 src/runtime/sense.js

## 文件
- `src/runtime/sense.js` (修改)

## 接口
```js
export async function init(videoElement: HTMLVideoElement): Promise<void>
export function on(type: string, handler: Function): void
export function start(): void
export function stop(): void
export function detect(frame: HTMLVideoElement): { faces, gestures, objects }
```

## 逻辑
- `init(video)`: createPipeline({ face, gesture, object: true })，存 pipeline._video
- `on(type, handler)`: 注册到 handlers[type] 数组
- `start()`: setInterval 100ms，调用 pipeline.detect(video)，emit 检测结果
  - faces → emit('face_detected', { boundingBox })
  - gestures → emit('gesture_detected', { gesture })
  - objects (confidence > 0.5) → emit('object_detected', { label, confidence })
- `stop()`: clearInterval + pipeline = null
- `detect(frame)`: 同步调用 pipeline.detect，返回标准化结果

## 边界情况
- video.readyState < 2：跳过本次检测
- pipeline 为 null 时 detect()：返回空结果 `{ faces:[], gestures:[], objects:[] }`
- start() 重复调用：先 clearInterval 再重新设置

## 测试用例
- start() 后 on('face_detected') 收到事件
- stop() 后不再 emit
- detect() pipeline=null 返回空结果
