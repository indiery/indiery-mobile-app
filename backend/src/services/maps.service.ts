import { env } from '../config/env';
import { stableDistanceKm } from './fare.service';

export interface DistanceInput {
  pickup: string;
  drop: string;
  extraStops?: Array<{
    label: string;
    address?: string;
    lat?: number;
    lng?: number;
  }>;
  pickupLat?: number;
  pickupLng?: number;
  dropLat?: number;
  dropLng?: number;
}

export interface RouteMetrics {
  distanceKm: number;
  durationMinutes?: number;
  source: 'google_directions' | 'google_distance_matrix' | 'fallback';
}

export interface LocationSuggestionResult {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText?: string;
}

export interface LocationDetailsResult {
  placeId: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
}

function coordinatePair(lat?: number, lng?: number) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return undefined;
  return `${lat},${lng}`;
}

function routePointValue(point: { label: string; address?: string; lat?: number; lng?: number }) {
  return coordinatePair(point.lat, point.lng) ?? point.address ?? point.label;
}

function routePointLabel(point: { label: string; address?: string }) {
  return point.address ?? point.label;
}

function fallbackDistanceKm(input: DistanceInput) {
  const stops = (input.extraStops ?? []).filter((stop) => stop.label.trim().length > 1);
  const fallbackPoints = [input.pickup, ...stops.map(routePointLabel), input.drop];
  if (fallbackPoints.length <= 2) return stableDistanceKm(input.pickup, input.drop);
  return Number(
    fallbackPoints
      .slice(0, -1)
      .reduce((total, point, index) => total + stableDistanceKm(point, fallbackPoints[index + 1] ?? point), 0)
      .toFixed(1)
  );
}

function routePointsFor(input: DistanceInput) {
  const stops = (input.extraStops ?? []).filter((stop) => stop.label.trim().length > 1);
  return [
    coordinatePair(input.pickupLat, input.pickupLng) ?? input.pickup,
    ...stops.map(routePointValue),
    coordinatePair(input.dropLat, input.dropLng) ?? input.drop
  ];
}

function googleMapsUrl(path: string, params: Record<string, string>) {
  const search = new URLSearchParams({
    ...params,
    key: env.GOOGLE_MAPS_API_KEY ?? ''
  });
  return `https://maps.googleapis.com/maps/api/${path}?${search.toString()}`;
}

export async function autocompleteLocations(input: string, sessionToken?: string): Promise<LocationSuggestionResult[]> {
  const query = input.trim();
  if (!env.GOOGLE_MAPS_API_KEY || query.length < 2) return [];

  try {
    const response = await fetch(
      googleMapsUrl('place/autocomplete/json', {
        input: query,
        components: 'country:in',
        types: 'geocode',
        ...(sessionToken ? { sessiontoken: sessionToken } : {})
      })
    );
    if (!response.ok) return [];
    const payload = (await response.json()) as {
      status?: string;
      predictions?: Array<{
        place_id?: string;
        description?: string;
        structured_formatting?: {
          main_text?: string;
          secondary_text?: string;
        };
      }>;
    };
    if (payload.status !== 'OK' && payload.status !== 'ZERO_RESULTS') return [];
    return (payload.predictions ?? [])
      .filter((item) => item.place_id && item.description)
      .slice(0, 6)
      .map((item) => ({
        placeId: item.place_id!,
        description: item.description!,
        mainText: item.structured_formatting?.main_text ?? item.description!,
        secondaryText: item.structured_formatting?.secondary_text
      }));
  } catch {
    return [];
  }
}

export async function resolveLocationDetails(placeId: string, sessionToken?: string): Promise<LocationDetailsResult | undefined> {
  const id = placeId.trim();
  if (!env.GOOGLE_MAPS_API_KEY || !id) return undefined;

  try {
    const response = await fetch(
      googleMapsUrl('place/details/json', {
        place_id: id,
        fields: 'place_id,name,formatted_address,geometry',
        ...(sessionToken ? { sessiontoken: sessionToken } : {})
      })
    );
    if (!response.ok) return undefined;
    const payload = (await response.json()) as {
      status?: string;
      result?: {
        place_id?: string;
        name?: string;
        formatted_address?: string;
        geometry?: { location?: { lat?: number; lng?: number } };
      };
    };
    const result = payload.result;
    const lat = result?.geometry?.location?.lat;
    const lng = result?.geometry?.location?.lng;
    if (payload.status !== 'OK' || !result?.place_id || typeof lat !== 'number' || typeof lng !== 'number') {
      return undefined;
    }
    const address = result.formatted_address ?? result.name ?? '';
    return {
      placeId: result.place_id,
      label: result.name ?? address,
      address,
      lat,
      lng
    };
  } catch {
    return undefined;
  }
}

async function resolveDirectionsMetrics(input: DistanceInput, mapsKey: string): Promise<RouteMetrics | undefined> {
  const routePoints = routePointsFor(input);
  const origin = routePoints[0];
  const destination = routePoints[routePoints.length - 1];
  if (!origin || !destination) return undefined;

  const waypoints = routePoints.slice(1, -1).filter(Boolean);
  const params = new URLSearchParams({
    origin,
    destination,
    mode: 'driving',
    units: 'metric',
    region: 'in',
    departure_time: 'now',
    traffic_model: 'best_guess',
    key: mapsKey,
    ...(waypoints.length ? { waypoints: waypoints.join('|') } : {})
  });

  try {
    const response = await fetch(`https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`);
    if (!response.ok) return undefined;
    const payload = (await response.json()) as {
      status?: string;
      routes?: Array<{
        legs?: Array<{
          distance?: { value?: number };
          duration?: { value?: number };
          duration_in_traffic?: { value?: number };
        }>;
      }>;
    };
    const legs = payload.routes?.[0]?.legs ?? [];
    if (payload.status !== 'OK' || !legs.length) return undefined;
    const distanceMeters = legs.reduce((total, leg) => total + (leg.distance?.value ?? 0), 0);
    const durationSeconds = legs.reduce(
      (total, leg) => total + (leg.duration_in_traffic?.value ?? leg.duration?.value ?? 0),
      0
    );
    if (distanceMeters <= 0) return undefined;
    return {
      distanceKm: Number(Math.max(0.5, distanceMeters / 1000).toFixed(1)),
      durationMinutes: durationSeconds > 0 ? Math.max(1, Math.ceil(durationSeconds / 60)) : undefined,
      source: 'google_directions'
    };
  } catch {
    return undefined;
  }
}

async function resolveDistanceMatrixMetrics(input: DistanceInput, mapsKey: string): Promise<RouteMetrics | undefined> {
  try {
    const routePoints = routePointsFor(input);
    const legDistances = await Promise.all(
      routePoints.slice(0, -1).map(async (origin, index) => {
        const destination = routePoints[index + 1];
        if (!destination) return undefined;
        const params = new URLSearchParams({
          origins: origin,
          destinations: destination,
          units: 'metric',
          departure_time: 'now',
          traffic_model: 'best_guess',
          key: mapsKey
        });
        const response = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`);
        if (!response.ok) return undefined;
        const payload = (await response.json()) as {
          rows?: Array<{
            elements?: Array<{
              status?: string;
              distance?: { value?: number };
              duration?: { value?: number };
              duration_in_traffic?: { value?: number };
            }>;
          }>;
        };
        const element = payload.rows?.[0]?.elements?.[0];
        const meters = element?.distance?.value;
        if (!meters || element?.status !== 'OK') return undefined;
        return {
          distanceKm: Math.max(0.5, meters / 1000),
          durationMinutes: Math.max(1, Math.ceil((element.duration_in_traffic?.value ?? element.duration?.value ?? 0) / 60))
        };
      })
    );
    if (legDistances.some((distance) => !distance)) return undefined;
    const distanceKm = legDistances.reduce<number>((total, distance) => total + (distance?.distanceKm ?? 0), 0);
    const durationMinutes = legDistances.reduce<number>((total, distance) => total + (distance?.durationMinutes ?? 0), 0);
    return {
      distanceKm: Number(distanceKm.toFixed(1)),
      durationMinutes: durationMinutes > 0 ? durationMinutes : undefined,
      source: 'google_distance_matrix'
    };
  } catch {
    return undefined;
  }
}

export async function resolveRouteMetrics(input: DistanceInput): Promise<RouteMetrics> {
  const fallback: RouteMetrics = {
    distanceKm: fallbackDistanceKm(input),
    source: 'fallback'
  };
  const mapsKey = env.GOOGLE_MAPS_API_KEY;
  if (!mapsKey) return fallback;

  return (
    (await resolveDirectionsMetrics(input, mapsKey)) ??
    (await resolveDistanceMatrixMetrics(input, mapsKey)) ??
    fallback
  );
}

export async function resolveDistanceKm(input: DistanceInput) {
  return (await resolveRouteMetrics(input)).distanceKm;
}
