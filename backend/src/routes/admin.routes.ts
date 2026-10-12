import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { asyncRoute } from '../middleware/error';
import { EnterpriseEnquiry } from '../models/EnterpriseEnquiry';

export const adminRouter = Router();

adminRouter.use(requireAuth(['admin']));

adminRouter.get(
  '/enterprise-enquiries',
  asyncRoute(async (req, res) => {
    const query = z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(25)
    }).parse(req.query);
    const [enquiries, total] = await Promise.all([
      EnterpriseEnquiry.find()
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean(),
      EnterpriseEnquiry.countDocuments()
    ]);
    res.json({ enquiries, total, page: query.page, limit: query.limit });
  })
);
