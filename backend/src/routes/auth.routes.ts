import { Router } from 'express';
import { z } from 'zod';
import { User } from '../models/User';
import { Vehicle } from '../models/Vehicle';
import { requireAuth, signToken, type AuthRequest } from '../middleware/auth';
import { asyncRoute, ApiError } from '../middleware/error';
import { serializeUser } from '../services/serialize.service';
import { verifyFirebasePhoneToken } from '../services/firebase.service';
import { initialsFromName } from '../services/profile.service';
import { AccountDeletionRequest } from '../models/AccountDeletionRequest';

export const authRouter = Router();

const FirebaseLoginSchema = z.object({
  role: z.enum(['customer', 'partner']),
  firebaseIdToken: z.string().min(20)
});

async function ensureUser(phone: string, role: 'customer' | 'partner') {
  const existing = await User.findOne({ phone, role });
  if (existing) return existing;

  if (role === 'customer') {
    return User.create({
      role,
      phone,
      name: 'Indiery Customer',
      initials: initialsFromName('Indiery Customer'),
      city: 'Lucknow',
      customerProfile: {
        coins: 0,
        walletBalance: 0,
        savedAddresses: []
      }
    });
  }

  const vehicle = await Vehicle.findOne({ active: true }).sort({ capacityKg: 1 });
  if (!vehicle) throw new ApiError(500, 'No active vehicle catalog is configured');
  return User.create({
    role,
    phone,
    name: 'Indiery Partner',
    initials: initialsFromName('Indiery Partner'),
    city: 'Lucknow',
    partnerProfile: {
      vehicleId: vehicle?._id,
      vehicleNumber: '',
      rating: 5,
      online: false,
      walletBalance: 0,
      weeklyOrders: 0,
      kycStatus: 'not_started',
      docs: {
        selfie: false,
        pan: false,
        aadhaar: false,
        drivingLicence: false,
        rc: false,
        insurance: false,
        bank: false
      }
    }
  });
}

authRouter.post(
  '/firebase-login',
  asyncRoute(async (req, res) => {
    const body = FirebaseLoginSchema.parse(req.body);
    const verification = await verifyFirebasePhoneToken(body.firebaseIdToken);
    const user = await ensureUser(verification.phone, body.role);
    const token = signToken(String(user._id), body.role);
    res.json({ token, user: serializeUser(user) });
  })
);

authRouter.post(
  '/account-deletion-request',
  requireAuth(['customer', 'partner']),
  asyncRoute<AuthRequest>(async (req, res) => {
    const body = z.object({ reason: z.string().trim().max(800).optional() }).parse(req.body);
    const user = await User.findById(req.auth!.userId);
    if (!user) throw new ApiError(404, 'User not found');

    await AccountDeletionRequest.create({
      role: req.auth!.role,
      user: user._id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      reason: body.reason,
      source: 'in_app'
    });

    res.status(201).json({ ok: true, status: 'requested' });
  })
);
