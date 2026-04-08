#!/usr/bin/env node
/**
 * Voice Stream Client Example
 * 
 * Demonstrates sentence-level streaming TTS:
 * 1. Send audio to server
 * 2. Receive transcription
 * 3. Receive audio chunks as each sentence is generated
 * 4. Play audio immediately (simulated here with console.log)
 */

import WebSocket from 'ws';
import { readFileSync } from 'fs';

const WS_URL = process.env.WS_URL || 'ws://localhost:1234';
const AUDIO_FILE = process.argv[2];

if (!AUDIO_FILE) {
  console.error('Usage: node voice-stream-client.js <audio-file.wav>');
  process.exit(1);
}

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('Connected to server');
  
  // Read audio file and encode as base64
  const audioBuffer = readFileSync(AUDIO_FILE);
  const audioBase64 = audioBuffer.toString('base64');
  
  // Send voice stream request
  ws.send(JSON.stringify({
    type: 'voice_stream',
    audio: audioBase64,
    history: []
  }));
  
  console.log('Sent audio, waiting for response...\n');
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  
  switch (msg.type) {
    case 'transcription':
      console.log(`[STT] "${msg.text}"\n`);
      break;
      
    case 'voice_stream_start':
      console.log('[Stream] Started\n');
      break;
      
    case 'audio_chunk':
      console.log(`[TTS Chunk ${msg.index}] "${msg.text}"`);
      console.log(`  → Audio: ${msg.audio.length} bytes (base64)`);
      console.log(`  → Would play audio here...\n`);
      break;
      
    case 'voice_stream_end':
      if (msg.skipped) {
        console.log('[Stream] Skipped (no voice activity)');
      } else {
        console.log(`[Stream] Completed (${msg.sentenceCount} sentences)`);
      }
      ws.close();
      break;
      
    case 'error':
      console.error(`[Error] ${msg.error}`);
      ws.close();
      break;
  }
});

ws.on('error', (err) => {
  console.error('WebSocket error:', err.message);
  process.exit(1);
});

ws.on('close', () => {
  console.log('\nDisconnected');
  process.exit(0);
});
