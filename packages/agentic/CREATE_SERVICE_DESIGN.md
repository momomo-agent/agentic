# createService — 设计文档

**主题**：`ai.createService()` 的语义、实现与边界。

---

## 1. 问题陈述

### 1.1 今天的现状

`Agentic` 门面已经存在，并且正确地把"是否走 service"作为一个配置分支：

```js
new Agentic({ serviceUrl: 'http://localhost:1234' })  // → WebSocket 走 service
new Agentic({ provider: 'ollama', baseUrl: ... })     // → core 直连 LLM
```

问题是：用户必须**自己保证 service 在跑**。跑了才能传 serviceUrl，没跑的话，`new Agentic({ serviceUrl })` 会连到一个不存在的端点。

### 1.2 kenefe 的目标

> electron 如果本地有 service 了 复用；如果没有 就可以自己一行启动；如果局域网有 也可以配置；**永远保证能使用**。

这是个**可用性承诺**。框架必须给，不能让用户去处理端口、进程、发现、降级。

### 1.3 kenefe 的纠正

> createService 的点重点不是连接，而是启动 service。

这句话的分量：
- **create 是创造，不是建立连接**
- Agentic 不是 "service client"，它是 "service owner"
- 生命周期归 Agentic 管

这就排除了"createService = probe + connect"的设计——那叫 connectService，不叫 create。

---

## 2. 语义定义

### 2.1 `createService()` 是什么

**字面解读**：创造一个 service，让它从"不存在"变成"存在"。

**承诺**：调用返回后，保证有一个 agentic-service 正在某处运行，且 `ai` 已经跟它绑定。

**生命周期**：
- service 是 ai 创造的，归 ai 管
- `ai.disposeService()` 或 ai 销毁时，service 被关闭
- service crash，ai 可以感知并（可选）重启

### 2.2 `useService()` 是什么（配对方法）

**语义**：attach 到一个别人家已经起好的 service，不参与生命周期。

```js
ai.useService('http://mac-mini.local:1234')  // 连局域网
ai.useService()                                 // 自动发现
```

对比：
```
createService → 我的 service，我负责生老病死
useService    → 别人的 service，我只用不管
```

两个方法语义清爽，不混淆。

### 2.3 `disposeService()` 是什么

对称关闭 createService 创造的 service。不影响 useService 连接的远端 service。

---

## 3. 三种运行形态（先搞清楚再谈实现）

`createService` 内部要处理三种启动形态，选哪个取决于**环境**和**用户意图**：

### 3.1 In-process（进程内）

service 作为一个库在当前进程里启动。`startServer(port)` 直接在 ai 所在进程里跑。

**优点**：
- 没有 IPC 开销，请求就是函数调用
- 没有进程管理负担（不会有僵尸进程）
- 打包容易（electron 里 ai 和 service 同一个进程）

**缺点**：
- **污染主进程内存**——engines / stt / tts / ollama 加载后都在主进程里
- service 崩溃 = 主进程崩溃
- 主进程 CPU 密集时 service 被拖慢
- 无法被其他 app 复用

**适用**：Node CLI、轻量 electron app、单 app 独占场景

### 3.2 Subprocess（子进程）

`spawn('agentic-service', ['--port', N])`，service 独立进程。

**优点**：
- 隔离（service 崩溃不会拖死主进程）
- 可复用（别的 app 可以连同一个 service）
- 主进程保持轻量
- 能用 detached 做成常驻 daemon

**缺点**：
- 进程生命周期要管（父死子存活？僵尸？重启？）
- 启动慢（cold start 几秒）
- 找 bin 复杂（依赖/全局/源码三种路径）
- electron 打包时要把 service 当独立可执行文件带上

**适用**：桌面 app、长期运行、多 app 共享

### 3.3 Remote（远端）

service 在另一台机器上。ai 只是 attach。

**这不属于 createService**——属于 useService。写在这里是为了排除。

---

## 4. 核心决策：默认形态选哪个？

**最大的设计决策就是这个。** 三种形态各有权衡，`createService()` 作为"一行启动"的默认，到底默认哪个？

### 4.1 候选方案对比

| 维度 | In-process 默认 | Subprocess 默认 |
|------|----------------|-----------------|
| 启动速度 | 快（< 1s） | 慢（2-5s） |
| 主进程负担 | 重 | 轻 |
| 崩溃隔离 | ❌ | ✅ |
| 多 app 复用 | ❌ | ✅（通过 reuse 端口） |
| electron 打包复杂度 | 低 | 中 |
| 资源占用 | 单份 | 单份（共享的话） |
| 调试 | 容易 | 要看 service stdout |

### 4.2 我的判断：**默认 In-process**，opt-in Subprocess

理由：

1. **"一行启动"的承诺首要是"能用"，其次才是"最优"**。In-process 几乎不会失败（没进程间通信，没端口冲突，没 spawn 依赖）。

2. **Subprocess 的优势（隔离、复用）在多 app 场景才重要**。但单 app 开发才是 80% 场景——electron app 就是它一个在用 service，没有复用需求。

3. **Subprocess 的复杂度是真实成本**。bin 找不到、端口占用、spawn 失败、僵尸进程——每一个都能让 demo 跑不起来。

4. **In-process 可以无痛升级到 subprocess**。用户感觉不到的切换：
   ```js
   ai.createService()                  // 默认 in-process
   ai.createService({ isolate: true }) // 升级到 subprocess
   ```

5. **Subprocess 的真正价值场景是 reuse**，这个用 `useService()` 就够了：
   ```js
   // 先试复用，复用不到才 spawn
   try { await ai.useService('http://localhost:1234') }
   catch { await ai.createService() }  // 失败就自己起一个 in-process
   ```

### 4.3 反向思考：kenefe 心里默认的是哪种？

kenefe 说 "如果本地有 service 了 复用"——这暗示了**期望 service 是独立的 daemon，多 app 能共享**。这跟 in-process 默认冲突。

**重新权衡**：

如果把 "service 是 daemon" 作为产品愿景，那：
- Subprocess 是**默认**
- In-process 是**特殊场景的优化**（electron 嵌入式、测试）
- Reuse-first 是标配（已有 daemon 不再起新的）

如果把 "service 是 app 的运行时" 作为产品愿景（每个 app 自带一份），那：
- In-process 是**默认**
- Subprocess 是**隔离需求的升级**

**这是两种产品哲学**：
- 哲学 A（shared daemon）：service 像 ollama，系统一份，多 app 共享。`createService` 本质是 "确保系统里有 daemon"
- 哲学 B（bundled runtime）：service 像 electron 的 Chromium，每个 app 自带。`createService` 本质是 "给我这个 app 启动一份 service"

### 4.4 我倾向哲学 A，理由：

1. kenefe 的原话"**永远保证能使用**"+"**本地有就复用**" 指向 shared daemon
2. Ollama 的成功模式证明 shared daemon 可用性高
3. 资源效率：多个 app 同时在跑，共享一个 service 省一大堆内存
4. 符合 `agentic-service` 已经是独立 CLI 这个既成事实

### 4.5 但哲学 A 的 createService 不是"create"，是 "ensure"

这就回到 kenefe 原话"**重点不是连接，而是启动 service**"——

**新解读**：在哲学 A 下，"启动 service" 的意思是"**如果没有就启动，有就用**"。reuse 不是可选，是 fallback——因为 daemon 的天性就是"不重复启动"。

```js
async createService() {
  // 1. 有没有 daemon 已经在跑？
  if (await probe('http://localhost:1234')) {
    bind(/* reuse */)
    return { started: false, reused: true }
  }

  // 2. 没有 → 我来启动一个
  spawnDaemon()
  bind(/* spawned */)
  return { started: true, reused: false }
}
```

**这才是 kenefe 原话的真正意思**：不是像 connectService 那样"只连不起"，而是"**我确保 service 存在，要起就起**"。

---

## 5. 最终语义

```
createService()  = 确保有一个 service 在运行，并连接它
                   ├─ 已有 daemon → 复用
                   └─ 没有       → spawn daemon（默认 subprocess）

useService(url)  = 连接指定的 service，不管生命周期
                   ├─ 给 URL   → 直连
                   └─ 不给 URL → 自动发现（localhost + LAN）

disposeService() = 如果 service 是 createService spawn 的 → 关掉
                   如果是 reuse 的 → 只断开连接
```

**"启动" 是 createService 的可选副产品**，不是它的唯一工作。它的工作是**保证 service 存在**。

---

## 6. API 设计

```js
class Agentic {
  /**
   * Ensure an agentic-service is running and bind to it.
   *
   * Behavior:
   *  1. If `url` or `reuse: true` and something is running at localhost:1234, attach.
   *  2. Otherwise, spawn a new subprocess service.
   *  3. Wait for /health to be ready.
   *  4. Bind WebSocket + serviceUrl for subsequent ai.think/speak/listen/... calls.
   *
   * @param {object} [opts]
   * @param {number}  [opts.port=1234]    — preferred port (auto-incremented if taken)
   * @param {boolean} [opts.reuse=true]   — reuse existing daemon at this port if alive
   * @param {'subprocess'|'inprocess'} [opts.mode='subprocess']
   * @param {boolean} [opts.detached=false] — keep service alive after this process exits (daemon mode)
   * @param {number}  [opts.readyTimeout=30000]
   * @param {'inherit'|'pipe'|'ignore'} [opts.stdio='pipe']
   * @param {object}  [opts.env]
   * @returns {Promise<ServiceHandle>}
   */
  async createService(opts = {}) { ... }

  /**
   * Attach to an existing service. Does not manage lifecycle.
   * @param {string} [url='auto'] — 'auto' to probe localhost + mDNS
   */
  async useService(url = 'auto') { ... }

  /**
   * If service was created by createService, kill it. Else, just disconnect.
   */
  async disposeService() { ... }

  /** @returns {ServiceHandle|null} */
  get service() { return this._service }
}

/**
 * ServiceHandle shape
 */
{
  status: 'spawned' | 'reused' | 'inprocess' | 'remote',
  endpoint: 'http://localhost:1234',
  pid: 12345 | null,
  ownedByUs: true | false,
  capabilities: { models: [...], ... },
  dispose: () => Promise<void>,
}
```

---

## 7. 实现难点与方案

### 7.1 找 service bin（subprocess 模式）

按优先级：
1. `import.meta.resolve('agentic-service/bin/agentic-service.js')` — monorepo / workspace
2. `require.resolve('agentic-service/bin/agentic-service.js')` — npm install
3. `$(which agentic-service)` — 全局装了
4. `process.env.AGENTIC_SERVICE_BIN` — 用户显式指定

找不到 → 抛明确错误 + 安装指南。

### 7.2 端口管理

```js
async function ensurePort(preferred = 1234) {
  if (await isPortFree(preferred)) return preferred
  for (let p = preferred + 1; p < preferred + 100; p++) {
    if (await isPortFree(p)) return p
  }
  throw new Error(`No free port near ${preferred}`)
}
```

### 7.3 Ready 检测

轮询 `GET /health`（service 已经有这个 endpoint，line 109）。
- 轮询间隔：100ms
- 超时：30s（可配）
- 快速失败：spawn 进程提前 exit → 立即 reject

### 7.4 进程生命周期

**默认（非 detached）**：父进程退出时子进程跟死。
```js
child = spawn(..., { detached: false })
process.once('exit', () => { try { child.kill() } catch {} })
process.once('SIGINT', () => { child.kill(); process.exit() })
```

**detached: true（daemon 模式）**：
```js
child = spawn(..., { detached: true, stdio: 'ignore' })
child.unref()
// 把 pid 写到 ~/.agentic-service/daemon.pid，下次 createService 能 reuse
```

### 7.5 Reuse 检测

```js
async function probeExisting(port) {
  try {
    const r = await fetch(`http://localhost:${port}/health`, { signal: AbortSignal.timeout(500) })
    if (r.ok) {
      const j = await r.json()
      return j.status === 'ok'
    }
  } catch {}
  return false
}
```

### 7.6 In-process 模式（opt-in）

```js
if (opts.mode === 'inprocess') {
  const { startServer } = await import('agentic-service')
  const server = await startServer(port)
  this._serviceUrl = `http://localhost:${port}`
  this._ws = createWsConnection(this._serviceUrl)
  this._service = { status: 'inprocess', server, dispose: () => stopServer(server) }
  return this._service
}
```

### 7.7 错误场景

| 场景 | 处理 |
|------|------|
| bin 找不到 | `throw new Error('agentic-service not installed. Run: npm i agentic-service')` |
| 端口全占 | 抛错 + 建议手动指定端口 |
| spawn 失败 | 立即 reject + 打印 stderr |
| /health 超时 | kill child + 抛错 |
| service 运行中崩溃 | emit 'disconnect'，可选 auto-restart |
| reuse 命中但握手失败 | 视为不可用，继续 spawn |

---

## 8. 集成到现有 Agentic class

**最小改动原则**：不改 `chat/think/speak/...` 的实现，只在构造函数和 createService 里设置 `this._serviceUrl / this._ws`。

现有代码路径：
```js
if (this._ws) { /* 走 WebSocket */ }
else           { /* 走 core 直连 */ }
```

createService 做的事就是**填上 `this._ws`**。之后所有能力方法的 WebSocket 分支自动生效。

唯一需要的扩展：
- `this._service` 保存 ServiceHandle
- 构造时不立即建 ws（serviceUrl 仍然兼容，但 createService 是新路径）
- `disposeService` 对称清理

---

## 9. 不在这一期做的事（范围排除）

- ❌ **mDNS LAN 发现**：后续 useService 的增强，createService 不涉及
- ❌ **Cloud fallback**：用户主动传 provider 配置，createService 不做
- ❌ **跨 JS 环境的非 Node 支持**：Browser 不能 spawn 进程，这个环境用 useService 即可
- ❌ **Provider 协议重构**：现有 provider 机制够用，不在这期改
- ❌ **auto-restart on crash**：先观察事件，暴露 `ai.service.on('disconnect')`，不默认重启
- ❌ **daemon pid 持久化（detached 模式的 reuse）**：detached 场景后续再做

---

## 10. 开发计划

### Phase 1（半天）：subprocess 核心
- [ ] `createService({ mode: 'subprocess' })` — spawn + ready + bind
- [ ] `disposeService()` — kill child
- [ ] reuse 检测（port probe）
- [ ] 集成测试：起 service → ai.think() → 关 service

### Phase 2（半天）：in-process 模式
- [ ] `createService({ mode: 'inprocess' })`
- [ ] 动态 import agentic-service
- [ ] 测试 electron-like 场景

### Phase 3（半天）：useService
- [ ] `useService(url)` 直连
- [ ] `useService('auto')` 端口扫描（LAN 后续）

### Phase 4（半天）：打磨
- [ ] 错误消息友好化
- [ ] stdio 控制（silent / pipe / inherit）
- [ ] detached daemon 模式（可选）
- [ ] 文档 + demo

总计 2 人天左右。

---

## 11. 需要 kenefe 确认的问题

**A. 默认模式确认**
我选了 subprocess 默认 + reuse-first（第 4.5 节的哲学 A）。但这意味着每次 `createService()` 第一次都要 spawn 一个进程，会慢 2-5s。要不要提供一个快速路径 `inprocess`？

**B. Detached daemon 是否首期做？**
如果做：第一个 app 启动 service 后，退出时 service 不关，下个 app 能 reuse。
如果不做：每个 app 自己起，自己关，简单但不节省。

**C. "一行启动" 的 API 是 `createService()` 还是 `start()` 还是构造函数自动**？
```js
// 方案 1（当前方案）
const ai = new Agentic()
await ai.createService()

// 方案 2（更激进）
const ai = await Agentic.start()   // 自带 createService

// 方案 3（构造函数自动）
const ai = new Agentic({ service: 'auto' })  // 懒触发
```

**D. 如果 createService 失败（bin 找不到 / 端口全占），是否应该自动降级到用户配置的 cloud provider？**
我倾向：不自动降级，抛清晰错误让用户决定。自动降级容易掩盖真实问题。

---

## 12. 最后的小结

**createService 不是一个"连接方法"，是一个"确保 service 存在并可用"的基础设施调用。**

- 语义正确 ≠ 实现简单。实现的真正复杂度在生命周期和进程管理。
- 默认 subprocess + reuse-first 符合 kenefe 的哲学 A（shared daemon）。
- In-process 留作 opt-in，为 electron 嵌入场景服务。
- useService 和 disposeService 是必要配角，让语义对称。
