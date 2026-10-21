import type { PartnerLocation } from './types';

export type MapCoordinate = { latitude: number; longitude: number };

export function trackingDistanceMeters(from: MapCoordinate, to: MapCoordinate) {
  const latitudeMeters = (to.latitude - from.latitude) * 111_000;
  const longitudeMeters = (to.longitude - from.longitude) * 111_000 * Math.cos(to.latitude * Math.PI / 180);
  return Math.hypot(latitudeMeters, longitudeMeters);
}

export function trackingBearing(from: MapCoordinate, to: MapCoordinate) {
  const fromLat = from.latitude * Math.PI / 180;
  const toLat = to.latitude * Math.PI / 180;
  const deltaLng = (to.longitude - from.longitude) * Math.PI / 180;
  const y = Math.sin(deltaLng) * Math.cos(toLat);
  const x = Math.cos(fromLat) * Math.sin(toLat) - Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

export function trackingHeading(location: PartnerLocation | undefined, from?: MapCoordinate, to?: MapCoordinate, previous = 0) {
  // A stationary phone's compass heading is noisy; keep the last direction until it moves.
  if (location?.speed !== undefined && location.speed < 0.8) return previous;
  if (typeof location?.heading === 'number' && Number.isFinite(location.heading) && location.heading >= 0) {
    return location.heading % 360;
  }
  if (from && to && trackingDistanceMeters(from, to) >= 4) return trackingBearing(from, to);
  return previous;
}

export function trackingAnimationMs(elapsedMs: number, distanceMeters: number) {
  if (distanceMeters > 1000) return 0;
  return Math.min(4500, Math.max(450, elapsedMs * 0.85));
}

export function snapTrackingCoordinate(coordinate: MapCoordinate, route: MapCoordinate[], toleranceMeters = 25) {
  if (route.length < 2) return coordinate;
  const longitudeScale = 111_000 * Math.cos(coordinate.latitude * Math.PI / 180);
  let nearest: MapCoordinate | undefined;
  let nearestDistance = toleranceMeters;
  for (let index = 1; index < route.length; index += 1) {
    const start = route[index - 1];
    const end = route[index];
    const dx = (end.longitude - start.longitude) * longitudeScale;
    const dy = (end.latitude - start.latitude) * 111_000;
    const segmentLengthSquared = dx * dx + dy * dy;
    if (!segmentLengthSquared) continue;
    const fromStartX = (coordinate.longitude - start.longitude) * longitudeScale;
    const fromStartY = (coordinate.latitude - start.latitude) * 111_000;
    const fraction = Math.max(0, Math.min(1, (fromStartX * dx + fromStartY * dy) / segmentLengthSquared));
    const candidate = {
      latitude: start.latitude + (end.latitude - start.latitude) * fraction,
      longitude: start.longitude + (end.longitude - start.longitude) * fraction
    };
    const distance = trackingDistanceMeters(coordinate, candidate);
    if (distance < nearestDistance) {
      nearest = candidate;
      nearestDistance = distance;
    }
  }
  return nearest ?? coordinate;
}
