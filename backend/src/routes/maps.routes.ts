import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { ApiError, asyncRoute } from '../middleware/error';
import { autocompleteLocations, resolveLocationDetails, reverseGeocodeLocation } from '../services/maps.service';

export const mapsRouter = Router();

mapsRouter.use(requireAuth(['customer']));

mapsRouter.get(
  '/autocomplete',
  asyncRoute(async (req, res) => {
    const query = z.object({
      input: z.string().trim().min(2).max(160),
      sessionToken: z.string().trim().max(120).optional(),
      lat: z.coerce.number().min(-90).max(90).optional(),
      lng: z.coerce.number().min(-180).max(180).optional()
    }).parse(req.query);
    const bias = query.lat !== undefined && query.lng !== undefined
      ? { lat: query.lat, lng: query.lng }
      : undefined;
    const suggestions = await autocompleteLocations(query.input, query.sessionToken, bias);
    res.json({ suggestions });
  })
);

mapsRouter.get(
  '/place-details',
  asyncRoute(async (req, res) => {
    const query = z.object({
      placeId: z.string().trim().min(3).max(240),
      sessionToken: z.string().trim().max(120).optional()
    }).parse(req.query);
    const location = await resolveLocationDetails(query.placeId, query.sessionToken);
    if (!location) throw new ApiError(404, 'Location details not found');
    res.json({ location });
  })
);

mapsRouter.get(
  '/reverse-geocode',
  asyncRoute(async (req, res) => {
    const query = z.object({
      lat: z.coerce.number().min(-90).max(90),
      lng: z.coerce.number().min(-180).max(180)
    }).parse(req.query);
    const location = await reverseGeocodeLocation(query.lat, query.lng);
    if (!location) throw new ApiError(404, 'Address not found for this point');
    res.json({ location });
  })
);
