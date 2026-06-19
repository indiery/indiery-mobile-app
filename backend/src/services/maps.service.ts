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

export async function resolveDistanceKm(input: DistanceInput) {
  const stops = (input.extraStops ?? []).filter((stop) => stop.label.trim().length > 1);
  const fallbackPoints = [input.pickup, ...stops.map(routePointLabel), input.drop];
  const fallback =
    fallbackPoints.length <= 2
      ? stableDistanceKm(input.pickup, input.drop)
      : Number(
          fallbackPoints
            .slice(0, -1)
            .reduce((total, point, index) => total + stableDistanceKm(point, fallbackPoints[index + 1] ?? point), 0)
            .toFixed(1)
        );
  const mapsKey = env.GOOGLE_MAPS_API_KEY;
  if (!mapsKey) return fallback;

  try {
    const routePoints = [
      coordinatePair(input.pickupLat, input.pickupLng) ?? input.pickup,
      ...stops.map(routePointValue),
      coordinatePair(input.dropLat, input.dropLng) ?? input.drop
    ];
    const legDistances = await Promise.all(
      routePoints.slice(0, -1).map(async (origin, index) => {
        const destination = routePoints[index + 1];
        if (!destination) return undefined;
        const params = new URLSearchParams({
          origins: origin,
          destinations: destination,
          units: 'metric',
          key: mapsKey
        });
        const response = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`);
        if (!response.ok) return undefined;
        const payload = (await response.json()) as {
          rows?: Array<{ elements?: Array<{ status?: string; distance?: { value?: number } }> }>;
        };
        const element = payload.rows?.[0]?.elements?.[0];
        const meters = element?.distance?.value;
        if (!meters || element?.status !== 'OK') return undefined;
        return Math.max(0.5, meters / 1000);
      })
    );
    if (legDistances.some((distance) => typeof distance !== 'number')) return fallback;
    return Number(legDistances.reduce<number>((total, distance) => total + (distance ?? 0), 0).toFixed(1));
  } catch {
    return fallback;
  }
}
