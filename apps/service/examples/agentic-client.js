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
  if (options.history) body.history = options.history;
  if (options.sessionId) body.sessionId = options.sessionId;
  if (options.tools) {
    body.tools = options.tools.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters || { type: "object", properties: {} }
      }
    }));
  }
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
    if (chunk.type === "tool_use") toolCalls.push({ name: chunk.name, args: chunk.input || {} });
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
    if (chunk.type === "content") yield { type: "content", text: chunk.text || "" };
    else if (chunk.type === "tool_use") yield { type: "tool_use", name: chunk.name, args: chunk.input || {} };
  }
  yield { type: "done" };
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

// src/client.js
var AgenticClient = class {
  constructor(baseUrl, options = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.options = { adapter: "auto", timeout: 3e4, ...options };
    this.transport = createTransport(this.baseUrl, this.options);
    this.admin = new Admin(this.transport);
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
};

  return _m.exports;
});
