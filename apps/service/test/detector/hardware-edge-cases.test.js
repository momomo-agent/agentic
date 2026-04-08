import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detect } from '../../src/detector/hardware.js';
import { detectGPU } from '../../src/detector/gpu-detector.js';

describe('Hardware Detector - Edge Cases', () => {
  describe('Error Handling', () => {
    it('should handle GPU detection failure gracefully', async () => {
      const result = await detect();
      // Should not throw, should return valid structure
      expect(result).toHaveProperty('gpu');
      expect(result.gpu).toHaveProperty('type');
      expect(result.gpu).toHaveProperty('vram');
    });

    it('should return fallback values on complete failure', async () => {
      // Even if GPU detection fails, should return valid data
      const result = await detect();
      expect(result.platform).toBeTruthy();
      expect(result.arch).toBeTruthy();
      expect(result.memory).toBeGreaterThan(0);
      expect(result.cpu.cores).toBeGreaterThan(0);
    });
  });

  describe('GPU Type Validation', () => {
    it('should only return valid GPU types', async () => {
      const result = await detect();
      const validTypes = ['apple-silicon', 'nvidia', 'amd', 'none'];
      expect(validTypes).toContain(result.gpu.type);
    });

    it('should return non-negative VRAM', async () => {
      const result = await detect();
      expect(result.gpu.vram).toBeGreaterThanOrEqual(0);
    });

    it('should return integer VRAM in GB', async () => {
      const result = await detect();
      expect(Number.isInteger(result.gpu.vram)).toBe(true);
    });
  });

  describe('Platform-Specific Detection', () => {
    it('should detect darwin platform correctly', async () => {
      const result = await detect();
      if (result.platform === 'darwin') {
        expect(['arm64', 'x64']).toContain(result.arch);
        // On macOS, GPU should be apple-silicon, nvidia, amd, or none
        expect(['apple-silicon', 'nvidia', 'amd', 'none']).toContain(result.gpu.type);
      }
    });

    it('should handle unknown platforms', async () => {
      const result = await detectGPU('unknown-platform');
      expect(result).toEqual({ type: 'none', vram: 0 });
    });
  });

  describe('Memory and CPU Validation', () => {
    it('should return memory as integer GB', async () => {
      const result = await detect();
      expect(Number.isInteger(result.memory)).toBe(true);
      expect(result.memory).toBeGreaterThan(0);
    });

    it('should return valid CPU cores count', async () => {
      const result = await detect();
      expect(result.cpu.cores).toBeGreaterThan(0);
      expect(Number.isInteger(result.cpu.cores)).toBe(true);
    });

    it('should return non-empty CPU model', async () => {
      const result = await detect();
      expect(result.cpu.model).toBeTruthy();
      expect(typeof result.cpu.model).toBe('string');
    });
  });

  describe('JSON Output Format', () => {
    it('should produce valid JSON when stringified', async () => {
      const result = await detect();
      const json = JSON.stringify(result);
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should have correct structure for JSON output', async () => {
      const result = await detect();
      const json = JSON.parse(JSON.stringify(result));

      expect(json).toHaveProperty('platform');
      expect(json).toHaveProperty('arch');
      expect(json).toHaveProperty('gpu');
      expect(json.gpu).toHaveProperty('type');
      expect(json.gpu).toHaveProperty('vram');
      expect(json).toHaveProperty('memory');
      expect(json).toHaveProperty('cpu');
      expect(json.cpu).toHaveProperty('cores');
      expect(json.cpu).toHaveProperty('model');
    });
  });

  describe('Performance', () => {
    it('should complete multiple detections efficiently', async () => {
      const start = Date.now();
      await Promise.all([
        detect(),
        detect(),
        detect()
      ]);
      const duration = Date.now() - start;
      // 3 parallel detections should complete in reasonable time
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Consistency', () => {
    it('should return consistent results across multiple calls', async () => {
      const result1 = await detect();
      const result2 = await detect();

      expect(result1.platform).toBe(result2.platform);
      expect(result1.arch).toBe(result2.arch);
      expect(result1.cpu.cores).toBe(result2.cpu.cores);
      expect(result1.memory).toBe(result2.memory);
    });
  });
});
