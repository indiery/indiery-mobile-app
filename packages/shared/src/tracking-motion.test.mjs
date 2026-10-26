import assert from 'node:assert/strict';
import test from 'node:test';
import { trackingAnimationMs, trackingHeading } from './tracking-motion.ts';

test('navigation arrow follows actual movement when GPS reports a low speed', () => {
  const start = { latitude: 26.85, longitude: 80.95 };
  const north = { latitude: 26.8501, longitude: 80.95 };
  const east = { latitude: 26.8501, longitude: 80.9501 };

  assert.equal(trackingHeading({ speed: 0, heading: 0 }, start, north, 0), 0);
  const turn = trackingHeading({ speed: 0, heading: 0 }, north, east, 0);
  assert.ok(turn > 80 && turn < 100);
});

test('navigation arrow uses a moving GPS heading and ignores tiny turns', () => {
  const position = { latitude: 26.85, longitude: 80.95 };
  assert.equal(trackingHeading({ speed: 4, heading: 95 }, position, position, 0), 95);
  assert.equal(trackingHeading({ speed: 4, heading: 98 }, position, position, 95), 95);
  assert.equal(trackingHeading({ speed: 0, heading: 180 }, position, position, 95), 95);
});

test('marker animation finishes before the next GPS update and skips a large jump', () => {
  assert.equal(trackingAnimationMs(3000, 12), 2550);
  assert.equal(trackingAnimationMs(7000, 12), 2600);
  assert.equal(trackingAnimationMs(3000, 300), 0);
});
