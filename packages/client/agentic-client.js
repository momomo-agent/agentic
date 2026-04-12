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
function createTransport(baseUrl, options = {}) {
  const timeout = options.timeout || 3e4;
  const streamTimeout = options.streamTimeout || 12e4;
  const isNode = typeof window === "undefined";
  function makeHeaders(extra = {}) {
    const h = { ...extra };
    if (options.apiKey) h["Authorization"] = `Bearer ${options.apiKey}`;
    return h;
  }
  async function request(method, path, body) {
    const opts = { method, signal: AbortSignal.timeout(timeout), headers: makeHeaders() };
    if (body !== void 0) {
      opts.headers["Content-Type"] = "application/json";
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
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("json")) return res.json();
    return res.text();
  }
  async function* streamSSE(method, path, body) {
    const opts = { method, headers: makeHeaders() };
    if (body !== void 0) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    let res;
    try {
      res = await fetch(`${baseUrl}${path}`, opts);
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
  }
  async function fetchBinary(method, path, body, headers = {}) {
    const opts = { method, signal: AbortSignal.timeout(streamTimeout), headers: makeHeaders(headers) };
    if (body !== void 0) {
      if (body instanceof FormData || typeof FormData !== "undefined" && body.constructor?.name === "FormData") {
        opts.body = body;
      } else {
        opts.headers["Content-Type"] = "application/json";
        opts.body = JSON.stringify(body);
      }
    }
    let res;
    try {
      res = await fetch(`${baseUrl}${path}`, opts);
    } catch (err) {
      if (err.name === "TimeoutError" || err.name === "AbortError") {
        throw new AgenticError("TIMEOUT", `Request timed out after ${streamTimeout}ms`);
      }
      throw new AgenticError("NETWORK", err.message);
    }
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new AgenticError(res.status, text);
    }
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("json")) return res.json();
    if (ct.includes("audio/") || ct.includes("application/octet-stream") || ct.includes("image/")) {
      const ab = await res.arrayBuffer();
      return isNode ? Buffer.from(ab) : ab;
    }
    return res.json();
  }
  return {
    get: (path) => request("GET", path),
    post: (path, body) => request("POST", path, body),
    put: (path, body) => request("PUT", path, body),
    del: (path) => request("DELETE", path),
    stream: (path, body) => streamSSE("POST", path, body),
    streamGet: (path) => streamSSE("GET", path),
    postBinary: (path, body) => fetchBinary("POST", path, body),
    postFormData: (path, formData) => fetchBinary("POST", path, formData),
    baseUrl
  };
}

// src/think.js
function think(transport, input, options = {}) {
  const body = {};
  if (typeof input === "string") {
    body.message = input;
  } else if (Array.isArray(input)) {
    body.messages = input;
  } else {
    Object.assign(body, input);
  }
  if (options.model) body.model = options.model;
  if (options.history) body.history = options.history;
  if (options.sessionId) body.sessionId = options.sessionId;
  if (options.temperature != null) body.temperature = options.temperature;
  if (options.maxTokens != null) body.max_tokens = options.maxTokens;
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
    return makeAsyncIterablePromise(streamThink(transport, body));
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
  return {
    [Symbol.asyncIterator]() {
      return asyncGen;
    },
    then(resolve, reject) {
      return Promise.resolve(asyncGen).then(resolve, reject);
    }
  };
}

// src/listen.js
async function listen(transport, audio, options = {}) {
  const fd = new FormData();
  if (audio instanceof Blob) {
    fd.append("audio", audio, "audio.webm");
  } else if (typeof File !== "undefined" && audio instanceof File) {
    fd.append("audio", audio);
  } else {
    const blob = new Blob([audio], { type: "audio/webm" });
    fd.append("audio", blob, "audio.webm");
  }
  if (options.language) fd.append("language", options.language);
  const result = await transport.postFormData("/api/transcribe", fd);
  return typeof result === "string" ? result : result.text || result.transcript || "";
}

// src/speak.js
async function speak(transport, text, options = {}) {
  const body = { text };
  if (options.voice) body.voice = options.voice;
  if (options.speed) body.speed = options.speed;
  return transport.postBinary("/api/synthesize", body);
}

// src/see.js
function see(transport, image, prompt, options = {}) {
  const body = { prompt: prompt || "Describe this image." };
  if (typeof image === "string") {
    if (image.startsWith("data:") || image.startsWith("http")) {
      body.image = image;
    } else {
      body.image = `data:image/jpeg;base64,${image}`;
    }
  } else if (image instanceof Blob) {
    return blobToBase64See(transport, image, body, options);
  }
  if (options.model) body.model = options.model;
  if (options.stream) {
    return makeAsyncIterablePromise2(streamSee(transport, body));
  }
  return collectSee(transport, body);
}
async function blobToBase64See(transport, blob, body, options) {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const b64 = typeof btoa !== "undefined" ? btoa(binary) : Buffer.from(buffer).toString("base64");
  body.image = `data:${blob.type || "image/jpeg"};base64,${b64}`;
  if (options.model) body.model = options.model;
  if (options.stream) {
    const gen = streamSee(transport, body);
    const result = { answer: "" };
    for await (const chunk of gen) {
      if (chunk.type === "text_delta") result.answer += chunk.text;
    }
    return result;
  }
  return collectSee(transport, body);
}
async function collectSee(transport, body) {
  let text = "";
  for await (const chunk of transport.stream("/api/vision", body)) {
    if (chunk.type === "content") text += chunk.text || "";
  }
  return { answer: text };
}
async function* streamSee(transport, body) {
  for await (const chunk of transport.stream("/api/vision", body)) {
    if (chunk.type === "content") {
      yield { type: "text_delta", text: chunk.text || "" };
    } else if (chunk.type === "error") {
      yield { type: "error", error: chunk.error || "unknown error" };
    }
  }
  yield { type: "done", stopReason: "end_turn" };
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

// src/converse.js
async function converse(transport, audio, options = {}) {
  const fd = new FormData();
  if (audio instanceof Blob) {
    fd.append("audio", audio, "audio.webm");
  } else if (typeof File !== "undefined" && audio instanceof File) {
    fd.append("audio", audio);
  } else {
    const blob = new Blob([audio], { type: "audio/webm" });
    fd.append("audio", blob, "audio.webm");
  }
  if (options.voice) fd.append("voice", options.voice);
  if (options.model) fd.append("model", options.model);
  if (options.sessionId) fd.append("sessionId", options.sessionId);
  const result = await transport.postFormData("/api/voice", fd);
  if (result instanceof ArrayBuffer || typeof Buffer !== "undefined" && Buffer.isBuffer(result)) {
    return { text: "", audio: result };
  }
  return {
    text: result.text || result.transcript || "",
    audio: result.audio || null
  };
}

// src/embed.js
async function embed(transport, input, options = {}) {
  const body = {
    input: Array.isArray(input) ? input : [input]
  };
  if (options.model) body.model = options.model;
  const result = await transport.post("/v1/embeddings", body);
  return {
    embeddings: (result.data || []).map((d) => d.embedding),
    model: result.model,
    usage: result.usage
  };
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
    converse: ollamaRunning && hasModels && hasStt && hasTts,
    embed: ollamaRunning && hasModels
  };
}

// src/admin.js
var Admin = class {
  constructor(transport) {
    this.transport = transport;
  }
  // ── Health & Status ──
  async health() {
    return this.transport.get("/api/health");
  }
  async status() {
    return this.transport.get("/api/status");
  }
  async perf() {
    return this.transport.get("/api/perf");
  }
  async queueStats() {
    return this.transport.get("/api/queue/stats");
  }
  async devices() {
    return this.transport.get("/api/devices");
  }
  async logs(limit = 50) {
    return this.transport.get("/api/logs");
  }
  // ── Config ──
  async config(newConfig) {
    if (newConfig) return this.transport.put("/api/config", newConfig);
    return this.transport.get("/api/config");
  }
  // ── Engines (new multi-engine API) ──
  async engines() {
    return this.transport.get("/api/engines");
  }
  async engineModels(engine) {
    const params = engine ? `?engine=${encodeURIComponent(engine)}` : "";
    return this.transport.get(`/api/engines/models${params}`);
  }
  async engineRecommended() {
    return this.transport.get("/api/engines/recommended");
  }
  async engineHealth() {
    return this.transport.get("/api/engines/health");
  }
  async *pullModel(model, options = {}) {
    const body = { model };
    if (options.engine) body.engine = options.engine;
    for await (const chunk of this.transport.stream("/api/engines/pull", body)) {
      yield chunk;
    }
  }
  async deleteModel(name) {
    return this.transport.del(`/api/engines/models/${encodeURIComponent(name)}`);
  }
  // ── Assignments (role → model mapping) ──
  async assignments() {
    return this.transport.get("/api/assignments");
  }
  async setAssignments(assignments) {
    return this.transport.put("/api/assignments", assignments);
  }
  // ── OpenAI-compatible models list ──
  async models() {
    return this.transport.get("/v1/models");
  }
};

// src/client.js
var AgenticClient = class {
  /**
   * @param {string} baseUrl - Server URL (e.g. 'http://localhost:1234')
   * @param {object} [options]
   * @param {string} [options.apiKey] - API key for authenticated endpoints
   * @param {number} [options.timeout=30000] - Request timeout in ms
   * @param {number} [options.streamTimeout=120000] - Stream/binary timeout in ms
   */
  constructor(baseUrl = "http://localhost:1234", options = {}) {
    if (typeof baseUrl === "object") {
      options = baseUrl;
      baseUrl = options.baseUrl || "http://localhost:1234";
    }
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.transport = createTransport(this.baseUrl, options);
    this.admin = new Admin(this.transport);
  }
  // ── Core AI Methods ──
  think(input, options) {
    return think(this.transport, input, options);
  }
  listen(audio, options) {
    return listen(this.transport, audio, options);
  }
  speak(text, options) {
    return speak(this.transport, text, options);
  }
  see(image, prompt, options) {
    return see(this.transport, image, prompt, options);
  }
  converse(audio, options) {
    return converse(this.transport, audio, options);
  }
  embed(input, options) {
    return embed(this.transport, input, options);
  }
  capabilities() {
    return capabilities(this.transport);
  }
};

  return _m.exports;
});
