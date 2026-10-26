import { Router } from 'express';
import { Vehicle } from '../models/Vehicle';
import { asyncRoute } from '../middleware/error';
import { serializeVehicle } from '../services/serialize.service';

export const metaRouter = Router();

metaRouter.get(
  '/vehicles',
  asyncRoute(async (_req, res) => {
    const vehicles = await Vehicle.find({ active: true }).sort({ capacityKg: 1 });
    res.json({ vehicles: vehicles.map(serializeVehicle) });
  })
);
