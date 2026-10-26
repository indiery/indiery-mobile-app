import { Router } from 'express';
import { z } from 'zod';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { asyncRoute } from '../middleware/error';
import { createCloudinaryUploadSignature } from '../services/cloudinary.service';

export const uploadRouter = Router();

uploadRouter.use(requireAuth(['customer', 'partner']));

uploadRouter.post(
  '/cloudinary-signature',
  asyncRoute(async (req: AuthRequest, res) => {
    const body = z
      .object({
        purpose: z.enum(['pod', 'kyc', 'profile']),
        orderId: z.string().optional(),
        documentKey: z.string().optional()
      })
      .parse(req.body);

    const upload = createCloudinaryUploadSignature({
      userId: req.auth!.userId,
      role: req.auth!.role,
      purpose: body.purpose,
      orderId: body.orderId,
      documentKey: body.documentKey
    });

    res.json({ upload });
  })
);
