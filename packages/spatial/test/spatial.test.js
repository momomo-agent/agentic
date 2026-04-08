import { describe, it, expect, beforeEach, vi } from 'vitest'

// Must mock before import — vi.mock is hoisted
// Cannot reference external variables in factory
vi.mock('../../agentic-core/agentic-core.js', () => {
  const mockFn = vi.fn()
  return {
    agenticAsk: mockFn,
    default: { agenticAsk: mockFn }
  }
})

import { reconstructSpace, SpatialSession } from '../src/index.js'
import * as agenticCore from '../../agentic-core/agentic-core.js'

const MOCK_SCENE = {
  room: { shape: 'rectangular', estimatedWidth: 7, estimatedDepth: 5 },
  anchors: [{ id: 'anchor_table_center', name: 'Main Table', type: 'table', x: 0.5, y: 0.4, z: 0.5 }],
  objects: [{ id: 'laptop_1', name: 'Laptop', type: 'electronics', x: 0.5, y: 0.46, z: 0.5, confidence: 0.9, seenIn: [0] }],
  people: [{ id: 'person_center_1', x: 0.5, y: 0.0, z: 0.3, pose: 'sitting', emotion: 'focused', activity: 'typing', lookingAtCamera: -1, interactingWith: [], seenIn: [0] }],
  cameras: [{ index: 0, position: { x: 0.5, y: 0.8, z: 0.0, facingDegrees: 180 }, fovDegrees: 60 }],
  behaviors: [{ type: 'solo_work', participants: ['person_center_1'], description: 'Working alone' }],
  attentionMap: {},
  coverage: { cameras: [], blindSpots: [] }
}

const mockImages = [{ data: 'data:image/jpeg;base64,AAA=', media_type: 'image/jpeg', deviceId: 'cam-1', name: 'Front' }]

describe('AgenticSpatial', () => {
  beforeEach(() => {
    agenticCore.agenticAsk.mockResolvedValue({ data: structuredClone(MOCK_SCENE) })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('reconstructSpace', () => {
    it('should throw without images', async () => {
      await expect(reconstructSpace({ apiKey: 'key' })).rejects.toThrow('At least one image is required')
    })

    it('should throw without apiKey', async () => {
      await expect(reconstructSpace({ images: mockImages })).rejects.toThrow('API key is required')
    })

    it('should reconstruct scene', async () => {
      const result = await reconstructSpace({ images: mockImages, apiKey: 'test-key' })
      expect(result.room).toBeDefined()
      expect(result.anchors).toBeInstanceOf(Array)
      expect(result.objects).toBeInstanceOf(Array)
      expect(result.people).toBeInstanceOf(Array)
      expect(result.cameras).toBeInstanceOf(Array)
      expect(result.meta.imageCount).toBe(1)
    })

    it('should attach deviceId to cameras', async () => {
      const result = await reconstructSpace({ images: mockImages, apiKey: 'test-key' })
      expect(result.cameras[0].deviceId).toBe('cam-1')
    })

    it('should call progress callback', async () => {
      const onProgress = vi.fn()
      await reconstructSpace({ images: mockImages, apiKey: 'test-key', onProgress })
      expect(onProgress).toHaveBeenCalledWith('start', expect.any(Object))
      expect(onProgress).toHaveBeenCalledWith('done', expect.any(Object))
    })

    it('should clamp out-of-bounds coordinates', async () => {
      agenticCore.agenticAsk.mockResolvedValueOnce({
        data: {
          ...MOCK_SCENE,
          objects: [{ id: 'obj1', name: 'X', type: 'furniture', x: 2.0, y: -1.0, z: 1.5 }],
          people: []
        }
      })
      const result = await reconstructSpace({ images: mockImages, apiKey: 'test-key' })
      expect(result.objects[0].x).toBe(1)
      expect(result.objects[0].y).toBe(0)
      expect(result.objects[0].z).toBe(1)
    })

    it('should add default emotion/activity to people', async () => {
      agenticCore.agenticAsk.mockResolvedValueOnce({
        data: { ...MOCK_SCENE, people: [{ id: 'p1', x: 0.5, y: 0, z: 0.5, pose: 'sitting' }] }
      })
      const result = await reconstructSpace({ images: mockImages, apiKey: 'test-key' })
      expect(result.people[0].emotion).toBe('neutral')
      expect(result.people[0].activity).toBe('idle')
      expect(result.people[0].interactingWith).toEqual([])
      expect(result.people[0].lookingAtCamera).toBe(-1)
    })

    it('should prevent people overlap', async () => {
      agenticCore.agenticAsk.mockResolvedValueOnce({
        data: {
          ...MOCK_SCENE,
          people: [
            { id: 'p1', x: 0.5, y: 0, z: 0.5, pose: 'sitting', emotion: 'neutral', activity: 'idle', interactingWith: [] },
            { id: 'p2', x: 0.501, y: 0, z: 0.501, pose: 'sitting', emotion: 'neutral', activity: 'idle', interactingWith: [] }
          ]
        }
      })
      const result = await reconstructSpace({ images: mockImages, apiKey: 'test-key' })
      const dx = result.people[1].x - result.people[0].x
      const dz = result.people[1].z - result.people[0].z
      expect(Math.sqrt(dx * dx + dz * dz)).toBeGreaterThanOrEqual(0.05)
    })

    it('should run ensemble mode', async () => {
      const onProgress = vi.fn()
      const result = await reconstructSpace({ images: mockImages, apiKey: 'test-key', ensemble: 3, onProgress })
      expect(result.meta.ensemble).toBe(true)
      expect(result.meta.ensembleRuns).toBe(3)
      expect(onProgress).toHaveBeenCalledWith('ensemble', expect.any(Object))
    })
  })

  describe('SpatialSession', () => {
    it('should initialize with config', () => {
      const session = new SpatialSession({ apiKey: 'test-key' })
      expect(session.state).toBeNull()
      expect(session.frameCount).toBe(0)
    })

    it('should analyze first frame', async () => {
      const session = new SpatialSession({ apiKey: 'test-key' })
      const scene = await session.analyze(mockImages)
      expect(scene).toBeDefined()
      expect(session.state).toBe(scene)
      expect(session.frameCount).toBe(1)
      expect(session.history).toHaveLength(1)
    })

    it('should update with new frame', async () => {
      const session = new SpatialSession({ apiKey: 'test-key' })
      await session.analyze(mockImages)

      agenticCore.agenticAsk.mockResolvedValueOnce({
        data: {
          ...MOCK_SCENE,
          people: [{ id: 'person_center_1', x: 0.6, y: 0, z: 0.3, pose: 'standing', emotion: 'neutral', activity: 'walking', lookingAtCamera: -1, interactingWith: [], seenIn: [1] }],
          changes: [{ type: 'pose_changed', id: 'person_center_1', description: 'Stood up', from: 'sitting', to: 'standing' }]
        }
      })

      const scene = await session.update(mockImages)
      expect(session.frameCount).toBe(2)
      expect(session.history[1].changes).toHaveLength(1)
    })

    it('should stabilize person IDs across frames', async () => {
      const session = new SpatialSession({ apiKey: 'test-key' })
      await session.analyze(mockImages)

      agenticCore.agenticAsk.mockResolvedValueOnce({
        data: {
          ...MOCK_SCENE,
          people: [{ id: 'person_new_99', x: 0.52, y: 0, z: 0.32, pose: 'sitting', emotion: 'neutral', activity: 'idle', lookingAtCamera: -1, interactingWith: [], seenIn: [1] }],
          changes: []
        }
      })

      const scene = await session.update(mockImages)
      expect(scene.people[0].id).toBe('person_center_1')
    })

    it('should get changes between frames', async () => {
      const session = new SpatialSession({ apiKey: 'test-key' })
      await session.analyze(mockImages)

      agenticCore.agenticAsk.mockResolvedValueOnce({
        data: { ...MOCK_SCENE, people: [], changes: [{ type: 'disappeared', id: 'person_center_1', description: 'Left' }] }
      })
      await session.update(mockImages)

      const changes = session.getChanges(1, 2)
      expect(changes).toHaveLength(1)
      expect(changes[0].type).toBe('disappeared')
    })

    it('should reset session', async () => {
      const session = new SpatialSession({ apiKey: 'test-key' })
      await session.analyze(mockImages)
      session.reset()
      expect(session.state).toBeNull()
      expect(session.frameCount).toBe(0)
      expect(session.history).toHaveLength(0)
    })
  })
})
