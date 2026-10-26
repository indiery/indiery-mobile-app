import assert from 'node:assert/strict';
import test from 'node:test';
import { distanceBetweenCoordinatesKm, pointIsCoveredByArea } from './service-area.service';

test('service-area circles cover points using great-circle distance', () => {
  const area = { id: 'test', centerLat: 28.6139, centerLng: 77.209, radiusKm: 2 };
  assert.equal(pointIsCoveredByArea({ lat: 28.62, lng: 77.21 }, area), true);
  assert.equal(pointIsCoveredByArea({ lat: 28.7, lng: 77.3 }, area), false);
  assert.ok(distanceBetweenCoordinatesKm({ lat: 28.6139, lng: 77.209 }, { lat: 28.6139, lng: 77.209 }) < 0.001);
});
