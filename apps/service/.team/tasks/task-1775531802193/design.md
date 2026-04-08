# Task: Confirm agentic-sense wrapping in runtime/sense.js

## Objective
Verify `runtime/sense.js` properly wraps the `agentic-sense` external package for MediaPipe face/gesture/object detection. Confirm package is listed in `package.json` dependencies and imports map.

## Files to Modify

### 1. `src/runtime/sense.js`

**Complete implementation wrapping agentic-sense:**

```javascript
import { 
  detectFace, 
  detectGesture, 
  detectObject,
  initializeMediaPipe 
} from 'agentic-sense';

class SenseRuntime {
  constructor() {
    this.initialized = false;
    this.mediaPipeReady = false;
  }

  async initialize(config = {}) {
    if (this.initialized) return;

    console.log('[SENSE] Initializing MediaPipe...');
    
    try {
      await initializeMediaPipe({
        modelPath: config.modelPath || '/models/mediapipe',
        backend: config.backend || 'wasm'
      });
      
      this.mediaPipeReady = true;
      this.initialized = true;
      console.log('[SENSE] MediaPipe initialized successfully');
    } catch (error) {
      console.error('[SENSE] Initialization failed:', error);
      throw error;
    }
  }

  async detectFaces(imageData, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const results = await detectFace(imageData, {
        maxFaces: options.maxFaces || 1,
        minDetectionConfidence: options.minConfidence || 0.5,
        ...options
      });

      return results.map(face => ({
        boundingBox: face.boundingBox,
        keypoints: face.keypoints,
        confidence: face.confidence,
        landmarks: face.landmarks
      }));
    } catch (error) {
      console.error('[SENSE] Face detection failed:', error);
      return [];
    }
  }

  async detectGestures(imageData, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const results = await detectGesture(imageData, {
        maxHands: options.maxHands || 2,
        minDetectionConfidence: options.minConfidence || 0.5,
        ...options
      });

      return results.map(hand => ({
        handedness: hand.handedness, // 'Left' or 'Right'
        landmarks: hand.landmarks,
        gesture: hand.gesture, // 'thumbs_up', 'peace', etc.
        confidence: hand.confidence
      }));
    } catch (error) {
      console.error('[SENSE] Gesture detection failed:', error);
      return [];
    }
  }

  async detectObjects(imageData, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const results = await detectObject(imageData, {
        maxObjects: options.maxObjects || 5,
        minDetectionConfidence: options.minConfidence || 0.5,
        ...options
      });

      return results.map(obj => ({
        label: obj.label,
        boundingBox: obj.boundingBox,
        confidence: obj.confidence
      }));
    } catch (error) {
      console.error('[SENSE] Object detection failed:', error);
      return [];
    }
  }

  async detectAll(imageData, options = {}) {
    const [faces, gestures, objects] = await Promise.all([
      this.detectFaces(imageData, options),
      this.detectGestures(imageData, options),
      this.detectObjects(imageData, options)
    ]);

    return { faces, gestures, objects };
  }

  isReady() {
    return this.mediaPipeReady;
  }
}

export default SenseRuntime;

// Convenience exports
export const detectFaces = async (imageData, options) => {
  const runtime = new SenseRuntime();
  return await runtime.detectFaces(imageData, options);
};

export const detectGestures = async (imageData, options) => {
  const runtime = new SenseRuntime();
  return await runtime.detectGestures(imageData, options);
};

export const detectObjects = async (imageData, options) => {
  const runtime = new SenseRuntime();
  return await runtime.detectObjects(imageData, options);
};
```

### 2. `package.json`

**Verify dependencies and imports:**

```json
{
  "name": "agentic-service",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "agentic-core": "^1.0.0",
    "agentic-embed": "^1.0.0",
    "agentic-sense": "^1.0.0",
    "agentic-store": "^1.0.0",
    "agentic-voice": "^1.0.0"
  },
  "imports": {
    "#agentic-core": "./node_modules/agentic-core/index.js",
    "#agentic-embed": "./node_modules/agentic-embed/index.js",
    "#agentic-sense": "./node_modules/agentic-sense/index.js",
    "#agentic-store": "./node_modules/agentic-store/index.js",
    "#agentic-voice": "./node_modules/agentic-voice/index.js"
  }
}
```

### 3. `test/runtime/sense.test.js`

**Create comprehensive tests:**

```javascript
import { describe, it, expect, beforeAll } from 'vitest';
import SenseRuntime from '../../src/runtime/sense.js';
import { readFileSync } from 'fs';

describe('SenseRuntime', () => {
  let sense;
  let testImage;

  beforeAll(async () => {
    sense = new SenseRuntime();
    await sense.initialize();
    
    // Load test image
    testImage = readFileSync('test/fixtures/test-face.jpg');
  });

  it('should initialize MediaPipe', async () => {
    expect(sense.isReady()).toBe(true);
  });

  it('should detect faces in image', async () => {
    const faces = await sense.detectFaces(testImage);

    expect(Array.isArray(faces)).toBe(true);
    if (faces.length > 0) {
      expect(faces[0]).toHaveProperty('boundingBox');
      expect(faces[0]).toHaveProperty('keypoints');
      expect(faces[0]).toHaveProperty('confidence');
    }
  });

  it('should detect gestures in image', async () => {
    const gestures = await sense.detectGestures(testImage);

    expect(Array.isArray(gestures)).toBe(true);
    if (gestures.length > 0) {
      expect(gestures[0]).toHaveProperty('handedness');
      expect(gestures[0]).toHaveProperty('landmarks');
      expect(gestures[0]).toHaveProperty('gesture');
    }
  });

  it('should detect objects in image', async () => {
    const objects = await sense.detectObjects(testImage);

    expect(Array.isArray(objects)).toBe(true);
    if (objects.length > 0) {
      expect(objects[0]).toHaveProperty('label');
      expect(objects[0]).toHaveProperty('boundingBox');
      expect(objects[0]).toHaveProperty('confidence');
    }
  });

  it('should detect all features at once', async () => {
    const results = await sense.detectAll(testImage);

    expect(results).toHaveProperty('faces');
    expect(results).toHaveProperty('gestures');
    expect(results).toHaveProperty('objects');
  });

  it('should handle invalid image gracefully', async () => {
    const results = await sense.detectFaces(null);
    expect(results).toEqual([]);
  });
});
```

### 4. `src/server/api.js`

**Add API endpoints for sense capabilities:**

```javascript
// POST /api/sense/detect
app.post('/api/sense/detect', async (req, res) => {
  try {
    const { image, type } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: 'Image required' });
    }

    const imageBuffer = Buffer.from(image, 'base64');
    let results;

    switch (type) {
      case 'face':
        results = await sense.detectFaces(imageBuffer);
        break;
      case 'gesture':
        results = await sense.detectGestures(imageBuffer);
        break;
      case 'object':
        results = await sense.detectObjects(imageBuffer);
        break;
      case 'all':
      default:
        results = await sense.detectAll(imageBuffer);
    }

    res.json({ success: true, results });
  } catch (error) {
    console.error('[API] Sense detection error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

## Algorithm

1. Import detection functions from `agentic-sense`
2. Initialize MediaPipe models on first use
3. For each detection request:
   - Validate image data
   - Call appropriate detection function
   - Transform results to standard format
   - Return structured data
4. Handle errors gracefully

## Edge Cases

- **MediaPipe not loaded:** Initialize on first use
- **Invalid image data:** Return empty array
- **Model loading failure:** Retry or use fallback
- **Browser vs Node.js:** Handle different image formats
- **Large images:** Resize before processing

## Error Handling

- Validate image data before processing
- Catch and log all detection errors
- Return empty arrays on failure (don't throw)
- Provide meaningful error messages in logs

## Dependencies

- `agentic-sense` npm package (external)
- MediaPipe models (downloaded on init)

## Test Cases

1. **Unit test:** `detectFaces()` returns face data
2. **Unit test:** `detectGestures()` returns hand landmarks
3. **Unit test:** `detectObjects()` returns object labels
4. **Unit test:** `detectAll()` returns combined results
5. **Unit test:** Invalid input returns empty array
6. **Integration test:** API endpoint processes image
7. **E2E test:** Client sends image, receives detections

## Verification

```bash
# Install package
npm install agentic-sense

# Run tests
npm test -- test/runtime/sense.test.js

# Manual test
node -e "import('./src/runtime/sense.js').then(async m => {
  const sense = new m.default();
  await sense.initialize();
  console.log('Ready:', sense.isReady());
})"

# Check package.json
grep -q 'agentic-sense' package.json && echo 'Package listed'
```

## Notes

- `agentic-sense` must be published or available locally
- MediaPipe models downloaded to `/models/mediapipe` on first run
- Browser version uses WASM backend
- Node.js version may use native bindings for better performance
- Consider lazy loading models to reduce startup time
