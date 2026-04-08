# Task: Implement server-side wake word pipeline in sense.js

## Objective
Replace `startWakeWordPipeline()` stub with real microphone audio capture and wire wake word detection to trigger `hub.js` `brainChat()` without client interaction.

## Files to Modify

### 1. `src/runtime/sense.js`

**Function:** `startWakeWordPipeline(callback)`

```javascript
import mic from 'mic';

class SenseRuntime {
  constructor() {
    this.micInstance = null;
    this.wakeWordCallback = null;
  }

  async startWakeWordPipeline(callback) {
    this.wakeWordCallback = callback;

    // Configure microphone
    this.micInstance = mic({
      rate: '16000',
      channels: '1',
      encoding: 'signed-integer',
      device: 'default'
    });

    const micInputStream = this.micInstance.getAudioStream();

    micInputStream.on('data', async (audioBuffer) => {
      try {
        // Detect wake word in audio buffer
        const result = await this.detectWakeWord(audioBuffer);
        
        if (result.detected) {
          this.wakeWordCallback({
            type: 'wakeword',
            confidence: result.confidence,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error('[SENSE] Wake word detection error:', error);
      }
    });

    micInputStream.on('error', (err) => {
      console.error('[SENSE] Microphone error:', err);
    });

    this.micInstance.start();
    console.log('[SENSE] Wake word pipeline started');

    return this.micInstance;
  }

  async stopWakeWordPipeline() {
    if (this.micInstance) {
      this.micInstance.stop();
      this.micInstance = null;
      console.log('[SENSE] Wake word pipeline stopped');
    }
  }

  async detectWakeWord(audioBuffer) {
    // Use agentic-sense or simple keyword detection
    // For now, implement basic energy-based detection
    const energy = this.calculateAudioEnergy(audioBuffer);
    const threshold = 1000; // Adjust based on testing

    return {
      detected: energy > threshold,
      confidence: Math.min(energy / threshold, 1.0)
    };
  }

  calculateAudioEnergy(buffer) {
    let sum = 0;
    for (let i = 0; i < buffer.length; i += 2) {
      const sample = buffer.readInt16LE(i);
      sum += sample * sample;
    }
    return Math.sqrt(sum / (buffer.length / 2));
  }
}

export default SenseRuntime;
```

### 2. `src/server/hub.js`

**Integration:** Wire wake word event to trigger brain chat

```javascript
import SenseRuntime from '../runtime/sense.js';

class Hub {
  constructor() {
    this.sense = new SenseRuntime();
    this.brain = null; // Initialized elsewhere
  }

  async startWakeWordListener() {
    await this.sense.startWakeWordPipeline((event) => {
      console.log('[HUB] Wake word detected:', event);
      
      // Trigger brain chat without client interaction
      this.handleWakeWordDetection(event);
    });
  }

  async handleWakeWordDetection(event) {
    if (event.confidence > 0.7) {
      // Start listening for voice command
      const sessionId = 'wake-word-session';
      
      // Notify all connected clients
      this.broadcastToAll({
        type: 'wakeword-detected',
        confidence: event.confidence,
        timestamp: event.timestamp
      });

      // Optionally auto-start voice capture
      // this.brain.startVoiceCapture(sessionId);
    }
  }

  broadcastToAll(message) {
    // Send to all WebSocket clients
    for (const client of this.clients) {
      client.send(JSON.stringify(message));
    }
  }
}
```

### 3. `package.json`

Add dependency:
```json
{
  "dependencies": {
    "mic": "^2.1.2"
  }
}
```

## Algorithm

1. Initialize microphone with 16kHz mono audio
2. Stream audio data in chunks
3. For each chunk:
   - Calculate audio energy or run wake word model
   - If threshold exceeded, trigger callback
4. Callback notifies hub.js
5. Hub broadcasts wake word event to clients

## Edge Cases

- **No microphone available:** Catch error and log warning, disable wake word feature
- **Permission denied:** Handle gracefully, show user message
- **High false positive rate:** Adjust confidence threshold
- **Background noise:** Implement noise gate or use pre-trained wake word model

## Error Handling

- Wrap audio processing in try-catch
- Log all errors with context
- Gracefully degrade if wake word fails
- Provide fallback to manual trigger

## Dependencies

- `mic` npm package for audio capture
- Node.js native audio APIs
- Optional: pre-trained wake word model (Porcupine, Snowboy)

## Test Cases

1. **Unit test:** `startWakeWordPipeline()` initializes microphone
2. **Unit test:** `detectWakeWord()` returns correct confidence
3. **Integration test:** Wake word event triggers hub callback
4. **Integration test:** Hub broadcasts to connected clients
5. **E2E test:** Speak wake word, verify brain chat starts

## Verification

```bash
# Run tests
npm test -- test/runtime/sense.test.js

# Manual test
node -e "import('./src/runtime/sense.js').then(m => {
  const sense = new m.default();
  sense.startWakeWordPipeline(e => console.log('Detected:', e));
})"
```
