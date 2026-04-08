# task-1775509998581 设计 — src/runtime/memory.js

## 文件
`src/runtime/memory.js`

## 接口
```js
export async function add(text: string): Promise<void>
export async function search(query: string, topK?: number): Promise<Array<{text: string, score: number}>>
export async function remove(key: string): Promise<void>
export { remove as delete }
```

## 依赖
- `./embed.js` → `embed(text): Float32Array`
- `../store/index.js` → `get(key)`, `set(key, val)`, `del(key)`

## 逻辑
1. `add(text)` — 通过 `_lock` Promise 链串行执行：embed → 生成唯一 id → set 条目 → 更新 INDEX_KEY
2. `search(query, topK=5)` — embed query → 加载全部索引条目 → 余弦相似度排序 → 返回 top K
3. `remove(key)` — del 条目 → 从 INDEX_KEY 列表中过滤掉该 id

## 常量
```js
const INDEX_KEY = 'mem:__index__'
```

## 错误处理
- `search('')` → 直接返回 `[]`
- embed 返回空向量 → 返回 `[]`
- 索引为空 → 返回 `[]`

## 测试用例
- add + search → 返回相关条目，score > 0
- 空 query → 返回 []
- remove → 后续 search 不再返回该条目
- 并发 add → 串行执行，索引一致
