#!/usr/bin/env node
import { init as initSTT, transcribe } from '../src/runtime/stt.js';
import { chat } from '../src/runtime/llm.js';
import { init as initTTS, synthesize } from '../src/runtime/tts.js';

async function runSTT(audioBuffer) {
  const t0 = Date.now();
  const text = await transcribe(audioBuffer);
  return { text, ms: Date.now() - t0 };
}

async function runLLM(text) {
  const t0 = Date.now();
  let reply = '';
  for await (const chunk of chat(text)) {
    if (chunk.content) reply += chunk.content;
  }
  return { reply, ms: Date.now() - t0 };
}

async function runTTS(text) {
  const t0 = Date.now();
  const audio = await synthesize(text);
  return { audio, ms: Date.now() - t0 };
}

async function main() {
  try {
    await Promise.all([initSTT(), initTTS()]);
  } catch (e) {
    console.error('Runtime init failed:', e.message);
    process.exit(1);
  }

  const audioBuffer = Buffer.alloc(16000); // 1s silence @ 16kHz

  let sttResult, llmResult, ttsResult;
  try {
    sttResult = await runSTT(audioBuffer);
    llmResult = await runLLM(sttResult.text || 'hello');
    ttsResult = await runTTS(llmResult.reply || 'ok');
  } catch (e) {
    console.error('Benchmark failed:', e.message);
    process.exit(1);
  }

  const result = {
    stt: sttResult.ms,
    llm: llmResult.ms,
    tts: ttsResult.ms,
    total: sttResult.ms + llmResult.ms + ttsResult.ms,
  };
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.total < 2000 ? 0 : 1);
}

main();
