import { describe, it, expect, beforeEach } from 'vitest';
import { registerDevice, unregisterDevice, getDevices } from '../../src/server/hub.js';

beforeEach(() => {
  // Clear registry between tests
  getDevices().forEach(d => unregisterDevice(d.id));
});

describe('hub.js - device registry', () => {
  it('getDevices returns empty array when no devices registered', () => {
    expect(getDevices()).toEqual([]);
  });

  it('registerDevice adds device to registry', () => {
    registerDevice({ id: 'dev-1', name: 'Test', type: 'local' });
    const devices = getDevices();
    expect(devices.length).toBe(1);
    expect(devices[0].id).toBe('dev-1');
  });

  it('registerDevice upserts on duplicate id', () => {
    registerDevice({ id: 'dev-1', name: 'Old', type: 'local' });
    registerDevice({ id: 'dev-1', name: 'New', type: 'remote' });
    const devices = getDevices();
    expect(devices.length).toBe(1);
    expect(devices[0].name).toBe('New');
  });

  it('unregisterDevice removes device', () => {
    registerDevice({ id: 'dev-1', name: 'Test', type: 'local' });
    unregisterDevice('dev-1');
    expect(getDevices()).toEqual([]);
  });

  it('unregisterDevice unknown id is no-op', () => {
    expect(() => unregisterDevice('nonexistent')).not.toThrow();
  });
});
