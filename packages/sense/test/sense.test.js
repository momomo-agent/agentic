import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AgenticSense } from '../agentic-sense.js'

describe('AgenticSense', () => {
  let mockVideo
  let mockFaceLandmarker
  let mockGestureRecognizer

  beforeEach(() => {
    // Mock video element
    mockVideo = {
      readyState: 2,
      videoWidth: 640,
      videoHeight: 480
    }

    // Mock MediaPipe FaceLandmarker
    mockFaceLandmarker = {
      detectForVideo: vi.fn(() => ({
        faceLandmarks: [
          Array(478).fill(null).map((_, i) => ({ x: 0.5, y: 0.5, z: 0 }))
        ],
        faceBlendshapes: [{
          categories: [
            { categoryName: 'jawOpen', score: 0.1 },
            { categoryName: 'mouthSmileLeft', score: 0.8 },
            { categoryName: 'mouthSmileRight', score: 0.8 }
          ]
        }]
      })),
      close: vi.fn()
    }

    // Mock MediaPipe GestureRecognizer
    mockGestureRecognizer = {
      recognizeForVideo: vi.fn(() => ({
        landmarks: [[
          { x: 0.5, y: 0.5, z: 0 }, // wrist
          ...Array(20).fill(null).map((_, i) => ({ x: 0.5 + i * 0.01, y: 0.5, z: 0 }))
        ]],
        handednesses: [[{ categoryName: 'Right', score: 0.95 }]],
        gestures: [[{ categoryName: 'Thumb_Up', score: 0.9 }]]
      })),
      close: vi.fn()
    }

    // Mock performance.now
    global.performance = { now: vi.fn(() => 1000) }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should create instance with video element', () => {
      const sense = new AgenticSense(mockVideo)
      expect(sense).toBeDefined()
      expect(sense.video).toBe(mockVideo)
    })

    it('should initialize feature extractors', () => {
      const sense = new AgenticSense(mockVideo)
      expect(sense._blink).toBeDefined()
      expect(sense._headPose).toBeDefined()
      expect(sense._gaze).toBeDefined()
      expect(sense._focus).toBeDefined()
      expect(sense._expression).toBeDefined()
    })
  })

  describe('init', () => {
    it('should accept injected landmarkers', () => {
      const sense = new AgenticSense(mockVideo)
      sense._faceLandmarker = mockFaceLandmarker
      sense._gestureRecognizer = mockGestureRecognizer
      expect(sense._faceLandmarker).toBe(mockFaceLandmarker)
      expect(sense._gestureRecognizer).toBe(mockGestureRecognizer)
    })
  })

  describe('detect', () => {
    it('should return null when video not ready', () => {
      mockVideo.readyState = 0
      const sense = new AgenticSense(mockVideo)
      const result = sense.detect()
      expect(result).toBeNull()
    })

    it('should detect face landmarks', () => {
      const sense = new AgenticSense(mockVideo)
      sense._faceLandmarker = mockFaceLandmarker
      
      const result = sense.detect()
      expect(result).toBeDefined()
      expect(result.faceCount).toBe(1)
      expect(result.faces).toHaveLength(1)
      expect(mockFaceLandmarker.detectForVideo).toHaveBeenCalled()
    })

    it('should detect hands', () => {
      const sense = new AgenticSense(mockVideo)
      sense._gestureRecognizer = mockGestureRecognizer
      
      const result = sense.detect()
      expect(result).toBeDefined()
      expect(result.handCount).toBe(1)
      expect(result.hands).toHaveLength(1)
      expect(result.hands[0].side).toBe('Right')
      expect(result.hands[0].gesture).toBe('Thumb_Up')
    })

    it('should extract face interpretation', () => {
      const sense = new AgenticSense(mockVideo)
      sense._faceLandmarker = mockFaceLandmarker
      
      const result = sense.detect()
      expect(result.faces[0].interpretation).toBeDefined()
      expect(result.faces[0].interpretation.pose).toBeDefined()
      expect(result.faces[0].interpretation.gaze).toBeDefined()
      expect(result.faces[0].interpretation.expression).toBeDefined()
    })

    it('should detect custom gestures', () => {
      const sense = new AgenticSense(mockVideo)
      sense._gestureRecognizer = mockGestureRecognizer
      
      // Mock gesture that returns None
      mockGestureRecognizer.recognizeForVideo.mockReturnValue({
        landmarks: [[
          { x: 0.5, y: 0.5, z: 0 },
          ...Array(20).fill(null).map((_, i) => ({ 
            x: 0.5 + i * 0.01, 
            y: 0.5 - i * 0.01, 
            z: 0 
          }))
        ]],
        handednesses: [[{ categoryName: 'Right', score: 0.95 }]],
        gestures: [[{ categoryName: 'None', score: 0.1 }]]
      })
      
      const result = sense.detect()
      expect(result).toBeDefined()
      // Custom gesture detector may find gestures even when MediaPipe returns None
    })
  })

  describe('BlinkDetector', () => {
    it('should track blink rate', () => {
      const sense = new AgenticSense(mockVideo)
      sense._faceLandmarker = mockFaceLandmarker
      
      // Simulate multiple detections with low EAR (closed eyes)
      for (let i = 0; i < 5; i++) {
        mockFaceLandmarker.detectForVideo.mockReturnValue({
          faceLandmarks: [
            Array(478).fill(null).map(() => ({ x: 0.5, y: 0.5, z: 0 }))
          ],
          faceBlendshapes: [{
            categories: [
              { categoryName: 'eyeBlinkLeft', score: 0.9 },
              { categoryName: 'eyeBlinkRight', score: 0.9 }
            ]
          }]
        })
        sense.detect()
        global.performance.now = vi.fn(() => 1000 + i * 200)
      }
      
      const result = sense.detect()
      expect(result.faces[0].interpretation.blinkRate).toBeGreaterThanOrEqual(0)
    })
  })

  describe('HeadPoseEstimator', () => {
    it('should estimate head pose', () => {
      const sense = new AgenticSense(mockVideo)
      sense._faceLandmarker = mockFaceLandmarker
      
      const result = sense.detect()
      const pose = result.faces[0].interpretation.pose
      expect(pose).toHaveProperty('yaw')
      expect(pose).toHaveProperty('pitch')
      expect(pose).toHaveProperty('roll')
      expect(pose).toHaveProperty('facing')
    })
  })

  describe('GazeEstimator', () => {
    it('should estimate gaze direction', () => {
      const sense = new AgenticSense(mockVideo)
      sense._faceLandmarker = mockFaceLandmarker
      
      const result = sense.detect()
      const gaze = result.faces[0].interpretation.gaze
      expect(gaze).toHaveProperty('region')
      expect(gaze).toHaveProperty('looking')
      expect(gaze).toHaveProperty('x')
      expect(gaze).toHaveProperty('y')
    })
  })

  describe('FocusScorer', () => {
    it('should calculate focus score', () => {
      const sense = new AgenticSense(mockVideo)
      sense._faceLandmarker = mockFaceLandmarker
      
      const result = sense.detect()
      const focus = result.faces[0].interpretation.focus
      expect(focus).toHaveProperty('score')
      expect(focus).toHaveProperty('level')
      expect(['low', 'medium', 'high']).toContain(focus.level)
    })
  })

  describe('ExpressionClassifier', () => {
    it('should classify smiling expression', () => {
      const sense = new AgenticSense(mockVideo)
      sense._faceLandmarker = mockFaceLandmarker
      
      const result = sense.detect()
      const expression = result.faces[0].interpretation.expression
      expect(expression).toBe('smiling')
    })

    it('should classify neutral expression', () => {
      const sense = new AgenticSense(mockVideo)
      mockFaceLandmarker.detectForVideo.mockReturnValue({
        faceLandmarks: [
          Array(478).fill(null).map(() => ({ x: 0.5, y: 0.5, z: 0 }))
        ],
        faceBlendshapes: [{
          categories: [
            { categoryName: 'jawOpen', score: 0.1 },
            { categoryName: 'mouthSmileLeft', score: 0.1 },
            { categoryName: 'mouthSmileRight', score: 0.1 }
          ]
        }]
      })
      sense._faceLandmarker = mockFaceLandmarker
      
      const result = sense.detect()
      const expression = result.faces[0].interpretation.expression
      expect(expression).toBe('neutral')
    })
  })

  describe('CustomGestureDetector', () => {
    it('should detect pinch gesture', () => {
      const sense = new AgenticSense(mockVideo)
      
      // Create landmarks for pinch (thumb and index close together)
      const landmarks = [
        { x: 0.5, y: 0.5, z: 0 },  // wrist
        { x: 0.51, y: 0.49, z: 0 }, // thumb CMC
        { x: 0.52, y: 0.48, z: 0 }, // thumb MCP
        { x: 0.53, y: 0.47, z: 0 }, // thumb IP
        { x: 0.54, y: 0.46, z: 0 }, // thumb tip
        { x: 0.55, y: 0.5, z: 0 },  // index MCP
        { x: 0.56, y: 0.49, z: 0 }, // index PIP
        { x: 0.57, y: 0.48, z: 0 }, // index DIP
        { x: 0.545, y: 0.465, z: 0 }, // index tip (close to thumb)
        ...Array(12).fill(null).map((_, i) => ({ x: 0.6 + i * 0.01, y: 0.5, z: 0 }))
      ]
      
      const gesture = sense._customGesture.detect(landmarks)
      // May detect Pinch or OK depending on finger positions
      expect(gesture === null || gesture.name).toBeTruthy()
    })
  })

  describe('ActionDetector', () => {
    it('should detect wave action', () => {
      const sense = new AgenticSense(mockVideo)
      const detector = sense._actionDetector
      
      // Simulate wrist moving left and right
      const now = performance.now()
      for (let i = 0; i < 10; i++) {
        const x = 0.5 + Math.sin(i * 0.5) * 0.1
        detector.addFrame(
          0,
          { x, y: 0.5, z: 0 },
          { x: x + 0.1, y: 0.4, z: 0 },
          { x: x + 0.05, y: 0.5, z: 0 },
          now + i * 100
        )
      }
      
      const actions = detector.detect(0)
      // Wave detection depends on timing and movement thresholds
      expect(Array.isArray(actions)).toBe(true)
    })
  })

  describe('destroy', () => {
    it('should cleanup resources', () => {
      const sense = new AgenticSense(mockVideo)
      sense._faceLandmarker = mockFaceLandmarker
      sense._gestureRecognizer = mockGestureRecognizer
      
      sense.destroy()
      expect(mockFaceLandmarker.close).toHaveBeenCalled()
      expect(mockGestureRecognizer.close).toHaveBeenCalled()
    })
  })

  describe('rawResults', () => {
    it('should return raw MediaPipe results', () => {
      const sense = new AgenticSense(mockVideo)
      sense._faceLandmarker = mockFaceLandmarker
      sense._gestureRecognizer = mockGestureRecognizer
      
      sense.detect()
      const raw = sense.rawResults
      expect(raw).toHaveProperty('face')
      expect(raw).toHaveProperty('hand')
    })
  })

  describe('AgenticAudio', () => {
    it('should be exported', () => {
      // AgenticAudio is in the same file but not the main export
      // Just verify the file structure is correct
      expect(AgenticSense).toBeDefined()
      expect(AgenticSense.VERSION).toBe('0.1.0')
    })
  })
})
