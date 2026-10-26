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
  const movementHeading = from && to && trackingDistanceMeters(from, to) >= 4
    ? trackingBearing(from, to)
    : undefined;
  const gpsHeading = typeof location?.heading === 'number' && Number.isFinite(location.heading) && location.heading >= 0
    ? location.heading % 360
    : undefined;
  // Low reported speed can lag behind a real turn. Movement along the route is
  // a better direction in that case; ignore compass noise while stationary.
  const next = movementHeading !== undefined && (gpsHeading === undefined || (location?.speed !== undefined && location.speed < 0.8))
    ? movementHeading
    : gpsHeading !== undefined && (movementHeading !== undefined || location?.speed === undefined || location.speed >= 0.8)
      ? gpsHeading
      : previous;
  const turn = ((next - previous + 540) % 360) - 180;
  return Math.abs(turn) >= 5 ? next : previous;
}

export function trackingAnimationMs(elapsedMs: number, distanceMeters: number) {
  if (distanceMeters > 250) return 0;
  // Finish before the next active-trip GPS fix (normally every three seconds).
  return Math.min(2600, Math.max(250, elapsedMs * 0.85));
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
