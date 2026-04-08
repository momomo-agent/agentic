# Task Design: agentic-sense 视觉感知

## Files
- `src/runtime/sense.js` — 新建，封装 agentic-sense MediaPipe

## sense.js

```js
// 初始化
init(videoElement: HTMLVideoElement) → void

// 事件订阅
on(type: 'face_detected'|'gesture_detected'|'object_detected', handler: (data) => void) → void

// 控制
start() → void   // 启动帧处理循环 (requestAnimationFrame)
stop() → void    // 停止循环，释放资源
```

## 事件格式
```js
// face_detected
{ type: 'face_detected', data: { boundingBox: {x,y,w,h} }, ts: number }

// gesture_detected
{ type: 'gesture_detected', data: { gesture: string }, ts: number }

// object_detected
{ type: 'object_detected', data: { label: string, confidence: number }, ts: number }
```

## 逻辑
1. init() → 加载 agentic-sense pipeline（FaceDetector + GestureRecognizer + ObjectDetector）
2. start() → requestAnimationFrame 循环，每帧调用 pipeline.detect(videoElement)
3. 结果非空 → emit 对应事件给所有订阅 handler
4. 事件同时通过 WebSocket 发送至 server/hub.js（hub.broadcast）

## 边界情况
- videoElement 未就绪（readyState < 2）→ 跳过该帧
- agentic-sense 加载失败 → throw Error，调用方处理
- confidence < 0.5 的 object_detected → 过滤不发送

## 依赖
- agentic-sense（package.json 中已声明）
- server/hub.js（通过 import 引用，仅服务端使用时）

## 测试用例
- 人脸在画面中 → face_detected 事件，boundingBox 存在
- 手势在画面中 → gesture_detected 事件，gesture 非空
- 物体 confidence > 0.5 → object_detected 事件
- 物体 confidence <= 0.5 → 无事件
- stop() 后 → 不再触发事件
