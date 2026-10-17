import assert from 'node:assert/strict';
import test from 'node:test';
import type { NextFunction, Request, Response } from 'express';
import { createRateLimit } from './rateLimit';

function invoke(
  middleware: ReturnType<typeof createRateLimit>,
  key = 'client-a'
) {
  const headers: Record<string, string> = {};
  let nextCalled = false;
  let statusCode = 200;
  let body: unknown;

  const req = {
    headers: { 'x-test-key': key },
    ip: '203.0.113.10',
    socket: { remoteAddress: '203.0.113.10' }
  } as unknown as Request;
  const res = {
    setHeader(name: string, value: string | number | readonly string[]) {
      headers[name] = String(value);
      return this;
    },
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: unknown) {
      body = payload;
      return this;
    }
  } as unknown as Response;
  const next = (() => {
    nextCalled = true;
  }) as NextFunction;

  middleware(req, res, next);
  return { body, headers, nextCalled, statusCode };
}

test('allows requests through the configured maximum and reports remaining capacity', () => {
  const limiter = createRateLimit({ windowMs: 60_000, maxRequests: 2 });

  const first = invoke(limiter);
  const second = invoke(limiter);

  assert.equal(first.nextCalled, true);
  assert.equal(first.headers['RateLimit-Remaining'], '1');
  assert.equal(second.nextCalled, true);
  assert.equal(second.headers['RateLimit-Remaining'], '0');
});

test('returns retry details after the configured maximum is exceeded', () => {
  const limiter = createRateLimit({ windowMs: 60_000, maxRequests: 1 });

  invoke(limiter);
  const blocked = invoke(limiter);

  assert.equal(blocked.nextCalled, false);
  assert.equal(blocked.statusCode, 429);
  assert.ok(Number(blocked.headers['Retry-After']) > 0);
  assert.deepEqual(blocked.body, {
    message: 'Too many requests. Please try again shortly.',
    retryAfterSeconds: Number(blocked.headers['Retry-After'])
  });
});

test('tracks different generated keys independently', () => {
  const limiter = createRateLimit({
    windowMs: 60_000,
    maxRequests: 1,
    keyGenerator: (req) => String(req.headers['x-test-key'])
  });

  assert.equal(invoke(limiter, 'admin-a').nextCalled, true);
  assert.equal(invoke(limiter, 'admin-b').nextCalled, true);
  assert.equal(invoke(limiter, 'admin-a').statusCode, 429);
});
