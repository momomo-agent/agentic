;(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory()
  else if (typeof define === 'function' && define.amd) define(factory)
  else { var e = factory(); root.AgenticClient = e; for (var k in e) root[k] = e[k] }
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this, function() {
  'use strict'
  var _m = { exports: {} }, exports = _m.exports;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client.js
var client_exports = {};
__export(client_exports, {
  AgenticClient: () => AgenticClient,
  AgenticError: () => AgenticError
});
_m.exports = __toCommonJS(client_exports);

// src/transport.js
var AgenticError = class extends Error {
  constructor(status, message, code) {
    super(message);
    this.name = "AgenticError";
    this.status = status;
    this.code = code;
  }
};
function resolveAdapter(preference) {
  if (preference === "browser") return "browser";
  if (preference === "node") return "node";
  return typeof window !== "undefined" ? "browser" : "node";
}
function createTransport(baseUrl, options = {}) {
  const env = resolveAdapter(options.adapter);
  if (env === "browser") {
    return createFetchAdapter(baseUrl, options);
  }
  return createFetchAdapter(baseUrl, options, true);
}
function createFetchAdapter(baseUrl, options, isNode = false) {
  const timeout = options.timeout || 3e4;
  async function request(method, path, body) {
    const opts = { method, signal: AbortSignal.timeout(timeout) };
    if (body !== void 0) {
      opts.headers = { "Content-Type": "application/json" };
      opts.body = JSON.stringify(body);
    }
    let res;
    try {
      res = await fetch(`${baseUrl}${path}`, opts);
    } catch (err) {
      if (err.name === "TimeoutError" || err.name === "AbortError") {
        throw new AgenticError("TIMEOUT", `Request timed out after ${timeout}ms`);
      }
      throw new AgenticError("NETWORK", err.message);
    }
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new AgenticError(res.status, text);
    }
    return res.json();
  }
  return {
    async get(path) {
      return request("GET", path);
    },
    async post(path, body) {
      return request("POST", path, body);
    },
    async put(path, body) {
      return request("PUT", path, body);
    },
    async del(path) {
      return request("DELETE", path);
    },
    async *stream(path, body) {
      let res;
      try {
        res = await fetch(`${baseUrl}${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
      } catch (err) {
        throw new AgenticError("NETWORK", err.message);
      }
      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new AgenticError(res.status, text);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") return;
          try {
            yield JSON.parse(data);
          } catch {
          }
        }
      }
    },
    async postBinary(path, body) {
      let res;
      try {
        res = await fetch(`${baseUrl}${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(timeout)
        });
      } catch (err) {
        if (err.name === "TimeoutError" || err.name === "AbortError") {
          throw new AgenticError("TIMEOUT", `Request timed out after ${timeout}ms`);
        }
        throw new AgenticError("NETWORK", err.message);
      }
      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new AgenticError(res.status, text);
      }
      const ab = await res.arrayBuffer();
      return isNode ? Buffer.from(ab) : ab;
    },
    async postFormData(path, formData) {
      let res;
      try {
        res = await fetch(`${baseUrl}${path}`, {
          method: "POST",
          body: formData,
          signal: AbortSignal.timeout(timeout)
        });
      } catch (err) {
        if (err.name === "TimeoutError" || err.name === "AbortError") {
          throw new AgenticError("TIMEOUT", `Request timed out after ${timeout}ms`);
        }
        throw new AgenticError("NETWORK", err.message);
      }
      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new AgenticError(res.status, text);
      }
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("audio/") || ct.includes("application/octet-stream")) {
        const ab = await res.arrayBuffer();
        return isNode ? Buffer.from(ab) : ab;
      }
      return res.json();
    },
    async postBinaryFormData(path, formData) {
      let res;
      try {
        res = await fetch(`${baseUrl}${path}`, {
          method: "POST",
          body: formData,
          signal: AbortSignal.timeout(timeout)
        });
      } catch (err) {
        if (err.name === "TimeoutError" || err.name === "AbortError") {
          throw new AgenticError("TIMEOUT", `Request timed out after ${timeout}ms`);
        }
        throw new AgenticError("NETWORK", err.message);
      }
      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new AgenticError(res.status, text);
      }
      const ab = await res.arrayBuffer();
      return isNode ? Buffer.from(ab) : ab;
    }
  };
}

// src/think.js
function think(transport, input, options = {}) {
  const body = {};
  if (typeof input === "string") {
    body.message = input;
  } else {
    body.messages = input;
  }
  if (options.model) body.model = options.model;
  if (options.history) body.history = options.history;
  if (options.sessionId) body.sessionId = options.sessionId;
  if (options.tools) {
    body.tools = options.tools.map((t) => {
      if (t.type === "function" && t.function) return t;
      return {
        type: "function",
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters || { type: "object", properties: {} }
        }
      };
    });
  }
  if (options.toolChoice) body.tool_choice = options.toolChoice;
  if (options.stream) {
    const gen = streamThink(transport, body);
    return makeAsyncIterablePromise(gen);
  }
  return collectThink(transport, body, options);
}
async function collectThink(transport, body, options) {
  let text = "";
  const toolCalls = [];
  for await (const chunk of transport.stream("/api/chat", body)) {
    if (chunk.type === "content") text += chunk.text || "";
    if (chunk.type === "tool_use") toolCalls.push({ id: chunk.id, name: chunk.name, args: chunk.input || {} });
  }
  const result = { answer: text };
  if (toolCalls.length) result.toolCalls = toolCalls;
  if (options.schema) {
    try {
      result.data = JSON.parse(text);
    } catch {
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) result.data = JSON.parse(match[1].trim());
    }
  }
  return result;
}
async function* streamThink(transport, body) {
  for await (const chunk of transport.stream("/api/chat", body)) {
    if (chunk.type === "content") {
      yield { type: "text_delta", text: chunk.text || "" };
    } else if (chunk.type === "tool_use") {
      yield { type: "tool_use", id: chunk.id || "", name: chunk.name, input: chunk.input || {} };
    } else if (chunk.type === "error") {
      yield { type: "error", error: chunk.error || "unknown error" };
    }
  }
  yield { type: "done", stopReason: "end_turn" };
}
function makeAsyncIterablePromise(asyncGen) {
  const wrapper = {
    [Symbol.asyncIterator]() {
      return asyncGen;
    },
    // Also expose .then() so `await think(...)` still works
    then(resolve, reject) {
      return Promise.resolve(asyncGen).then(resolve, reject);
    }
  };
  return wrapper;
}

// src/listen.js
async function listen(transport, audio) {
  const formData = new FormData();
  formData.append("audio", audio, "audio.wav");
  const result = await transport.postFormData("/api/transcribe", formData);
  if (result.skipped) return "";
  return result.text;
}

// src/speak.js
async function speak(transport, text) {
  return transport.postBinary("/api/synthesize", { text });
}

// src/see.js
async function see(transport, image, prompt = "Describe this image", options = {}) {
  const base64 = await toBase64(image);
  const body = { image: base64, prompt };
  if (options.stream) {
    return streamSee(transport, body);
  }
  let text = "";
  for await (const chunk of transport.stream("/api/vision", body)) {
    if (chunk.type === "content") text += chunk.text || "";
  }
  return text;
}
async function* streamSee(transport, body) {
  for await (const chunk of transport.stream("/api/vision", body)) {
    if (chunk.type === "content") yield { type: "content", text: chunk.text || "" };
  }
  yield { type: "done" };
}
async function toBase64(input) {
  if (typeof input === "string") return input;
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(input)) {
    return input.toString("base64");
  }
  if (input instanceof ArrayBuffer) {
    if (typeof Buffer !== "undefined") return Buffer.from(input).toString("base64");
    return arrayBufferToBase64(input);
  }
  if (typeof Blob !== "undefined" && input instanceof Blob) {
    const ab = await input.arrayBuffer();
    if (typeof Buffer !== "undefined") return Buffer.from(ab).toString("base64");
    return arrayBufferToBase64(ab);
  }
  throw new Error("Unsupported image input type");
}
function arrayBufferToBase64(ab) {
  const bytes = new Uint8Array(ab);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// src/converse.js
async function converse(transport, audio) {
  const formData = new FormData();
  formData.append("audio", audio, "audio.wav");
  return transport.postBinaryFormData("/api/voice", formData);
}

// src/capabilities.js
async function capabilities(transport) {
  const status = await transport.get("/api/status");
  const ollamaRunning = status.ollama?.running === true;
  const hasModels = (status.ollama?.models?.length || 0) > 0;
  const hasStt = !!status.config?.stt || !!status.devices?.microphone;
  const hasTts = !!status.config?.tts || !!status.devices?.speaker;
  return {
    think: ollamaRunning && hasModels,
    listen: hasStt,
    speak: hasTts,
    see: ollamaRunning && hasModels,
    converse: ollamaRunning && hasModels && hasStt && hasTts
  };
}

// src/admin.js
var Admin = class {
  constructor(transport) {
    this.transport = transport;
  }
  async status() {
    return this.transport.get("/api/status");
  }
  async config(newConfig) {
    if (newConfig) return this.transport.put("/api/config", newConfig);
    return this.transport.get("/api/config");
  }
  async models() {
    const status = await this.transport.get("/api/status");
    return status.ollama?.models || [];
  }
  async *pullModel(model, onProgress) {
    for await (const chunk of this.transport.stream("/api/models/pull", { model })) {
      if (onProgress) onProgress(chunk);
      yield chunk;
    }
  }
  async deleteModel(name) {
    return this.transport.del(`/api/models/${encodeURIComponent(name)}`);
  }
  async logs(limit = 50) {
    return this.transport.get("/api/logs");
  }
  async perf() {
    return this.transport.get("/api/perf");
  }
  async devices() {
    return this.transport.get("/api/devices");
  }
};

// src/chat.js
function matchProvider(providers, model) {
  for (const p of providers) {
    if (!p.models) return p;
    for (const pattern of p.models) {
      if (globMatch(pattern, model)) return p;
    }
  }
  return null;
}
function globMatch(pattern, str) {
  const re = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
  return re.test(str);
}
function buildOpenAIBody(messages, options) {
  const body = {
    model: options.model,
    messages,
    stream: options.stream ?? false
  };
  if (options.maxTokens != null) body.max_tokens = options.maxTokens;
  if (options.temperature != null) body.temperature = options.temperature;
  if (options.tools?.length) {
    body.tools = options.tools;
    if (options.toolChoice) body.tool_choice = options.toolChoice;
  }
  return body;
}
async function* streamOpenAI(baseUrl, apiKey, messages, options) {
  const body = buildOpenAIBody(messages, { ...options, stream: true });
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
  let res;
  try {
    res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
  } catch (err) {
    yield { type: "error", error: err.message };
    return;
  }
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    yield { type: "error", error: `HTTP ${res.status}: ${text}` };
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const toolCallAccum = {};
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data === "[DONE]") {
        for (const tc of Object.values(toolCallAccum)) {
          let input = {};
          try {
            input = JSON.parse(tc.arguments);
          } catch {
          }
          yield { type: "tool_use", id: tc.id, name: tc.name, input };
        }
        yield { type: "done", stopReason: "end_turn" };
        return;
      }
      let parsed;
      try {
        parsed = JSON.parse(data);
      } catch {
        continue;
      }
      if (parsed.error) {
        yield { type: "error", error: parsed.error.message || JSON.stringify(parsed.error) };
        continue;
      }
      const choice = parsed.choices?.[0];
      if (!choice) continue;
      const delta = choice.delta || {};
      if (delta.content) {
        yield { type: "text_delta", text: delta.content };
      }
      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0;
          if (!toolCallAccum[idx]) {
            toolCallAccum[idx] = { id: tc.id || "", name: tc.function?.name || "", arguments: "" };
          }
          if (tc.id) toolCallAccum[idx].id = tc.id;
          if (tc.function?.name) toolCallAccum[idx].name = tc.function.name;
          if (tc.function?.arguments) toolCallAccum[idx].arguments += tc.function.arguments;
        }
      }
      if (choice.finish_reason) {
        const reason = choice.finish_reason === "tool_calls" ? "tool_use" : choice.finish_reason === "stop" ? "end_turn" : choice.finish_reason;
        for (const tc of Object.values(toolCallAccum)) {
          let input = {};
          try {
            input = JSON.parse(tc.arguments);
          } catch {
          }
          yield { type: "tool_use", id: tc.id, name: tc.name, input };
        }
        const usage = parsed.usage ? { inputTokens: parsed.usage.prompt_tokens, outputTokens: parsed.usage.completion_tokens } : void 0;
        yield { type: "done", stopReason: reason, ...usage && { usage } };
        return;
      }
    }
  }
  yield { type: "done", stopReason: "end_turn" };
}
async function chatOpenAINonStream(baseUrl, apiKey, messages, options) {
  const body = buildOpenAIBody(messages, { ...options, stream: false });
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new AgenticError(res.status, text);
  }
  const data = await res.json();
  const choice = data.choices?.[0];
  const msg = choice?.message || {};
  const result = { answer: msg.content || "" };
  if (msg.tool_calls?.length) {
    result.toolCalls = msg.tool_calls.map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      args: JSON.parse(tc.function.arguments || "{}")
    }));
  }
  return result;
}
function convertMessagesToAnthropic(messages) {
  let system = void 0;
  const msgs = [];
  for (const m of messages) {
    if (m.role === "system") {
      system = system ? system + "\n" + m.content : m.content;
    } else if (m.role === "tool") {
      msgs.push({
        role: "user",
        content: [{
          type: "tool_result",
          tool_use_id: m.tool_call_id,
          content: m.content
        }]
      });
    } else {
      msgs.push({ role: m.role, content: m.content });
    }
  }
  return { system, messages: msgs };
}
function convertToolsToAnthropic(tools) {
  if (!tools?.length) return void 0;
  return tools.map((t) => {
    const fn = t.type === "function" ? t.function : t;
    return {
      name: fn.name,
      description: fn.description || "",
      input_schema: fn.parameters || { type: "object", properties: {} }
    };
  });
}
function buildAnthropicBody(messages, options) {
  const { system, messages: msgs } = convertMessagesToAnthropic(messages);
  const body = {
    model: options.model,
    messages: msgs,
    max_tokens: options.maxTokens || 4096,
    stream: options.stream ?? false
  };
  if (system) body.system = system;
  if (options.temperature != null) body.temperature = options.temperature;
  const tools = convertToolsToAnthropic(options.tools);
  if (tools) body.tools = tools;
  if (options.toolChoice) {
    const tc = options.toolChoice;
    body.tool_choice = tc === "auto" ? { type: "auto" } : tc === "none" ? { type: "none" } : { type: "any" };
  }
  return body;
}
async function* streamAnthropic(baseUrl, apiKey, messages, options) {
  const body = buildAnthropicBody(messages, { ...options, stream: true });
  const headers = {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01"
  };
  let res;
  try {
    res = await fetch(`${baseUrl}/v1/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
  } catch (err) {
    yield { type: "error", error: err.message };
    return;
  }
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    yield { type: "error", error: `HTTP ${res.status}: ${text}` };
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let usage = void 0;
  const blocks = {};
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      let parsed;
      try {
        parsed = JSON.parse(line.slice(6));
      } catch {
        continue;
      }
      switch (parsed.type) {
        case "message_start":
          if (parsed.message?.usage) {
            usage = { inputTokens: parsed.message.usage.input_tokens, outputTokens: 0 };
          }
          break;
        case "content_block_start": {
          const idx = parsed.index ?? 0;
          const block = parsed.content_block || {};
          if (block.type === "tool_use") {
            blocks[idx] = { type: "tool_use", id: block.id || "", name: block.name || "", inputJson: "" };
          } else {
            blocks[idx] = { type: "text" };
          }
          break;
        }
        case "content_block_delta": {
          const idx = parsed.index ?? 0;
          const delta = parsed.delta || {};
          if (delta.type === "text_delta") {
            yield { type: "text_delta", text: delta.text };
          } else if (delta.type === "input_json_delta") {
            if (blocks[idx]) blocks[idx].inputJson += delta.partial_json || "";
          }
          break;
        }
        case "content_block_stop": {
          const idx = parsed.index ?? 0;
          const block = blocks[idx];
          if (block?.type === "tool_use") {
            let input = {};
            try {
              input = JSON.parse(block.inputJson);
            } catch {
            }
            yield { type: "tool_use", id: block.id, name: block.name, input };
          }
          delete blocks[idx];
          break;
        }
        case "message_delta": {
          const delta = parsed.delta || {};
          if (parsed.usage?.output_tokens && usage) {
            usage.outputTokens = parsed.usage.output_tokens;
          }
          const stopReason = delta.stop_reason || "end_turn";
          yield { type: "done", stopReason, ...usage && { usage } };
          return;
        }
        case "message_stop":
          break;
        case "error":
          yield { type: "error", error: parsed.error?.message || JSON.stringify(parsed.error) };
          return;
      }
    }
  }
  yield { type: "done", stopReason: "end_turn", ...usage && { usage } };
}
async function chatAnthropicNonStream(baseUrl, apiKey, messages, options) {
  const body = buildAnthropicBody(messages, { ...options, stream: false });
  const headers = {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01"
  };
  const res = await fetch(`${baseUrl}/v1/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new AgenticError(res.status, text);
  }
  const data = await res.json();
  const result = { answer: "" };
  const toolCalls = [];
  for (const block of data.content || []) {
    if (block.type === "text") result.answer += block.text;
    if (block.type === "tool_use") {
      toolCalls.push({ id: block.id, name: block.name, args: block.input || {} });
    }
  }
  if (toolCalls.length) result.toolCalls = toolCalls;
  return result;
}
function chat(providers, messages, options = {}) {
  const model = options.model;
  const provider = model ? matchProvider(providers, model) : null;
  if (!provider) {
    throw new AgenticError(400, `No provider matched for model "${model}"`);
  }
  if (options.stream) {
    const gen = provider.type === "anthropic" ? streamAnthropic(provider.baseUrl, provider.apiKey, messages, options) : streamOpenAI(provider.baseUrl, provider.apiKey, messages, options);
    return makeAsyncIterablePromise2(gen);
  }
  return provider.type === "anthropic" ? chatAnthropicNonStream(provider.baseUrl, provider.apiKey, messages, options) : chatOpenAINonStream(provider.baseUrl, provider.apiKey, messages, options);
}
function makeAsyncIterablePromise2(asyncGen) {
  return {
    [Symbol.asyncIterator]() {
      return asyncGen;
    },
    then(resolve, reject) {
      return Promise.resolve(asyncGen).then(resolve, reject);
    }
  };
}

// src/client.js
var AgenticClient = class {
  /**
   * @param {string} baseUrlOrConfig - Service URL string, or config object
   * @param {object} [options]
   *
   * Supports two constructor forms:
   *   new AgenticClient('http://localhost:11435')                    // existing
   *   new AgenticClient('http://localhost:11435', { providers: [] }) // existing + providers
   *   new AgenticClient({ serviceUrl, providers })                  // config object
   */
  constructor(baseUrlOrConfig, options = {}) {
    if (typeof baseUrlOrConfig === "string") {
      this.baseUrl = baseUrlOrConfig.replace(/\/$/, "");
      this.providers = options.providers || [];
    } else {
      const config = baseUrlOrConfig;
      this.baseUrl = config.serviceUrl ? config.serviceUrl.replace(/\/$/, "") : null;
      this.providers = config.providers || [];
    }
    if (this.baseUrl) {
      this.transport = createTransport(this.baseUrl, options);
      this.admin = new Admin(this.transport);
    } else {
      this.transport = null;
      this.admin = null;
    }
  }
  capabilities() {
    return capabilities(this.transport);
  }
  think(input, options) {
    return think(this.transport, input, options);
  }
  listen(audio) {
    return listen(this.transport, audio);
  }
  speak(text) {
    return speak(this.transport, text);
  }
  see(image, prompt, options) {
    return see(this.transport, image, prompt, options);
  }
  converse(audio) {
    return converse(this.transport, audio);
  }
  /**
   * Direct provider chat — routes to the right provider by model name.
   * Falls back to serviceUrl (via think()) if no provider matches.
   *
   * @param {Array} messages - Array of { role, content } messages
   * @param {object} [options] - { model, stream, maxTokens, temperature, tools, toolChoice }
   */
  chat(messages, options = {}) {
    return chat(this.providers, messages, options);
  }
};

  return _m.exports;
});
