/**
 * Auth middleware tests for task-1775896028548 (M103)
 */
import { describe, it, expect, vi } from 'vitest';
import { authMiddleware } from '../../src/server/middleware.js';

function mockReq(path, authorization) {
  return { path, headers: { authorization } };
}

function mockRes() {
  const res = { statusCode: null, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (data) => { res.body = data; return res; };
  return res;
}

describe('server/middleware authMiddleware', () => {
  it('no API key configured → all requests pass through', () => {
    const mw = authMiddleware(undefined);
    const next = vi.fn();
    mw(mockReq('/api/chat'), mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('valid Bearer token → request passes through', () => {
    const mw = authMiddleware('secret-key');
    const next = vi.fn();
    mw(mockReq('/api/chat', 'Bearer secret-key'), mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('missing Authorization header → 401', () => {
    const mw = authMiddleware('secret-key');
    const next = vi.fn();
    const res = mockRes();
    mw(mockReq('/api/chat'), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body.error.type).toBe('authentication_error');
  });

  it('invalid token → 401', () => {
    const mw = authMiddleware('secret-key');
    const next = vi.fn();
    const res = mockRes();
    mw(mockReq('/api/chat', 'Bearer wrong-key'), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body.error.message).toBe('Invalid API key');
  });

  it('/health exempt from auth', () => {
    const mw = authMiddleware('secret-key');
    const next = vi.fn();
    mw(mockReq('/health'), mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('/admin/* exempt from auth', () => {
    const mw = authMiddleware('secret-key');
    const next = vi.fn();
    mw(mockReq('/admin/dashboard'), mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  // DBB-025: /api/health must also be exempt
  it('/api/health exempt from auth (DBB-025)', () => {
    const mw = authMiddleware('secret-key');
    const next = vi.fn();
    mw(mockReq('/api/health'), mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  // Edge case: Bearer prefix with empty token
  it('Bearer with empty token → 401', () => {
    const mw = authMiddleware('secret-key');
    const next = vi.fn();
    const res = mockRes();
    mw(mockReq('/api/chat', 'Bearer '), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  // Edge case: error response includes code field (DBB-004 format)
  it('401 response includes code field', () => {
    const mw = authMiddleware('secret-key');
    const res = mockRes();
    mw(mockReq('/api/chat'), res, vi.fn());
    expect(res.body.error).toHaveProperty('code');
  });

  // Edge case: non-Bearer scheme (e.g. Basic)
  it('non-Bearer auth scheme → 401', () => {
    const mw = authMiddleware('secret-key');
    const next = vi.fn();
    const res = mockRes();
    mw(mockReq('/api/chat', 'Basic c2VjcmV0LWtleQ=='), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  // DBB-026: empty string key treated as no key (pass through)
  it('empty string API key → pass through (DBB-026)', () => {
    const mw = authMiddleware('');
    const next = vi.fn();
    mw(mockReq('/api/chat'), mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  // Edge case: /v1/* routes require auth when key is set
  it('/v1/chat/completions requires auth when key is set', () => {
    const mw = authMiddleware('secret-key');
    const next = vi.fn();
    const res = mockRes();
    mw(mockReq('/v1/chat/completions'), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  // Edge case: 401 error response has all three fields (message, type, code)
  it('401 error response has message, type, and code fields', () => {
    const mw = authMiddleware('secret-key');
    const res = mockRes();
    mw(mockReq('/v1/chat/completions'), res, vi.fn());
    expect(res.body.error).toHaveProperty('message');
    expect(res.body.error).toHaveProperty('type');
    expect(res.body.error).toHaveProperty('code');
    expect(res.body.error.type).toBe('authentication_error');
  });
});
