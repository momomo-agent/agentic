# task-1775509995439 设计 — src/runtime/sense.js

## 文件
`src/runtime/sense.js`

## 接口
```js
export async function init(videoElement: HTMLVideoElement): Promise<void>
export function detect(frame: HTMLVideoElement | ImageData): DetectResult
export function start(): void
export function stop(): void
export function on(type: string, handler: Function): void
// DetectResult: { faces: Face[], gestures: Gesture[], objects: Object[] }
```

## 逻辑
1. `init()` 调用 `createPipeline({ face, gesture, object: true })`，存 `pipeline._video`
2. `detect(frame)` 同步调用 `pipeline.detect(frame)`，映射结果结构；pipeline 为 null 返回空结构
3. `start()` 设置 100ms `setInterval`，读 `pipeline._video`，readyState≥2 时调用 detect 并 emit 事件
4. `stop()` 清除 interval，置 pipeline=null
5. `on(type, handler)` 追加到 `handlers[type]` 数组

## 事件类型
- `face_detected` → `{ boundingBox }`
- `gesture_detected` → `{ gesture }`
- `object_detected` → `{ label, confidence }` (confidence > 0.5)

## 错误处理
- `detect()` pipeline 未初始化 → 返回 `{ faces:[], gestures:[], objects:[] }`
- `start()` 重复调用 → 先 clearInterval 再重建

## 测试用例
- detect 未 init → 返回空结构
- on + start → 检测到人脸时触发 face_detected handler
- stop → interval 清除，不再触发事件
