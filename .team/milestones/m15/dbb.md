# M15 DBB - DBB修复 + sense.js兼容 + 唤醒词广播

## DBB-001: sense.js Node.js兼容
- Requirement: M15-scope-1
- Given: sense.js is loaded in a Node.js environment (no browser globals)
- Expect: No `ReferenceError: requestAnimationFrame is not defined` error; module loads successfully
- Verify: `node -e "require('./sense.js')"` exits with code 0 and no error output

## DBB-002: sense.js使用setInterval/process.nextTick
- Requirement: M15-scope-1
- Given: sense.js is running in Node.js
- Expect: Polling/tick logic uses `setInterval` or `process.nextTick`, not `requestAnimationFrame`
- Verify: Observable behavior — sense.js continues to emit events over time without crashing

## DBB-003: store.delete()方法可用
- Requirement: M15-scope-2
- Given: A store instance with key "foo" set
- Expect: `store.delete("foo")` removes the key; subsequent get returns undefined/null
- Verify: After `store.delete("foo")`, `store.get("foo")` returns no value

## DBB-004: store.del()别名可用
- Requirement: M15-scope-2
- Given: A store instance with key "bar" set
- Expect: `store.del("bar")` behaves identically to `store.delete("bar")`
- Verify: After `store.del("bar")`, `store.get("bar")` returns no value

## DBB-005: hub.js唤醒词广播
- Requirement: M15-scope-3
- Given: Two or more devices connected to hub; hub receives a `wakeword` event from any source
- Expect: All connected devices receive a `wakeword` event broadcast
- Verify: Each connected device's event listener fires with the wakeword payload

## DBB-006: 心跳超时为60秒
- Requirement: M15-scope-4
- Given: A device connects and stops sending heartbeats
- Expect: Device is marked offline/timed-out after 60000ms (not 40000ms)
- Verify: Device remains active at 59s of silence; is marked offline at or after 60s

## DBB-007: brain.js tool_use响应包含text字段
- Requirement: M15-scope-5
- Given: brain.js processes a tool_use response from the LLM
- Expect: The response object includes a `text` field (may be empty string but must be present)
- Verify: Inspecting the response payload shows `{ type: "tool_use", text: <string>, ... }`
