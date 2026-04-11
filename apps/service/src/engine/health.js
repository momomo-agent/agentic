/**
 * Engine Health Check — 定期检测引擎可用性，自动降级
 */

import EventEmitter from 'node:events';
import { getEngines } from './registry.js';

const emitter = new EventEmitter();
const healthState = new Map();
let timer = null;

/**
 * @typedef {{ status: 'healthy'|'degraded'|'down', lastCheck: number, latency: number|null, error: string|null }} HealthState
 */

async function checkAll() {
  const engines = getEngines();
  for (const engine of engines) {
    const start = Date.now();
    try {
      const result = await Promise.race([
        engine.status(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('health check timeout')), 5000)),
      ]);
      const latency = Date.now() - start;
      const prev = healthState.get(engine.id);
      const next = {
        status: result.available ? 'healthy' : 'down',
        lastCheck: Date.now(),
        latency,
        error: result.available ? null : (result.error || 'unavailable'),
      };
      healthState.set(engine.id, next);
      if (prev && prev.status !== next.status) {
        emitter.emit('change', { engineId: engine.id, prev: prev.status, next: next.status });
      }
    } catch (err) {
      const prev = healthState.get(engine.id);
      const next = { status: 'down', lastCheck: Date.now(), latency: null, error: err.message };
      healthState.set(engine.id, next);
      if (prev && prev.status !== next.status) {
        emitter.emit('change', { engineId: engine.id, prev: prev.status, next: next.status });
      }
    }
  }
}

export function startHealthCheck(intervalMs = 30_000) {
  checkAll();
  timer = setInterval(checkAll, intervalMs);
}

export function stopHealthCheck() {
  clearInterval(timer);
  timer = null;
}

export function getEngineHealth(engineId) {
  return healthState.get(engineId) || { status: 'healthy', lastCheck: 0, error: null, latency: null };
}

export function getAllHealth() {
  return Object.fromEntries(healthState);
}

export function isHealthy(engineId) {
  return healthState.get(engineId)?.status !== 'down';
}

export function onHealthChange(fn) {
  emitter.on('change', fn);
}

export function offHealthChange(fn) {
  emitter.off('change', fn);
}
