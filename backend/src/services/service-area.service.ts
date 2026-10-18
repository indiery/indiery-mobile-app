import { Types } from 'mongoose';
import { AdminWorkspace } from '../models/AdminWorkspace';
import { ApiError } from '../middleware/error';

export type ServiceAreaRecord = {
  id: string;
  city?: string;
  zone?: string;
  active?: boolean;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  vehicleIds?: string[];
};

function isServiceAreaRecord(value: unknown): value is ServiceAreaRecord {
  if (!value || typeof value !== 'object') return false;
  const area = value as Partial<ServiceAreaRecord>;
  return typeof area.id === 'string' &&
    typeof area.centerLat === 'number' && Number.isFinite(area.centerLat) && area.centerLat >= -90 && area.centerLat <= 90 &&
    typeof area.centerLng === 'number' && Number.isFinite(area.centerLng) && area.centerLng >= -180 && area.centerLng <= 180 &&
    typeof area.radiusKm === 'number' && Number.isFinite(area.radiusKm) && area.radiusKm > 0 && area.radiusKm <= 500;
}

export function distanceBetweenCoordinatesKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(b.lat - a.lat);
  const dLng = radians(b.lng - a.lng);
  const lat1 = radians(a.lat);
  const lat2 = radians(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function pointIsCoveredByArea(point: { lat: number; lng: number }, area: ServiceAreaRecord) {
  return distanceBetweenCoordinatesKm(point, { lat: area.centerLat, lng: area.centerLng }) <= area.radiusKm;
}

async function configuredAreas() {
  const record = await AdminWorkspace.findOne({ key: 'areas' }).lean();
  const value = record?.value;
  if (!Array.isArray(value)) return [];
  return value.filter(isServiceAreaRecord);
}

/**
 * Legacy area cards without coordinates are not treated as geofences. As soon
 * as a real circle is configured, all quote/order endpoints enforce its status.
 */
export async function assertOrderCovered(input: {
  pickupLat?: number;
  pickupLng?: number;
  dropLat?: number;
  dropLng?: number;
  vehicleId: string | Types.ObjectId;
}) {
  const areas = await configuredAreas();
  if (!areas.length) return;

  const points = [
    { label: 'Pickup', lat: input.pickupLat, lng: input.pickupLng },
    { label: 'Drop-off', lat: input.dropLat, lng: input.dropLng }
  ];
  const activeAreas = areas.filter((area) => area.active !== false);
  for (const point of points) {
    if (typeof point.lat !== 'number' || typeof point.lng !== 'number') {
      throw new ApiError(400, `Select ${point.label.toLowerCase()} on the map to check service coverage.`);
    }
    if (point.lat < -90 || point.lat > 90 || point.lng < -180 || point.lng > 180) {
      throw new ApiError(400, `${point.label} coordinates are invalid.`);
    }
    const covered = activeAreas.some((area) => {
      const supportsVehicle = !area.vehicleIds?.length || area.vehicleIds.includes(String(input.vehicleId));
      return supportsVehicle && pointIsCoveredByArea({ lat: point.lat!, lng: point.lng! }, area);
    });
    if (!covered) {
      throw new ApiError(403, `${point.label} is outside Indiery's active service areas for this vehicle.`);
    }
  }
}
