import { Router } from 'express';
import { z } from 'zod';
import { User } from '../models/User';
import { Vehicle } from '../models/Vehicle';
import { requireAuth, signToken, type AuthRequest } from '../middleware/auth';
import { asyncRoute, ApiError } from '../middleware/error';
import { serializeUser } from '../services/serialize.service';
import { verifyFirebasePhoneToken } from '../services/firebase.service';
import { initialsFromName } from '../services/profile.service';
import { normalizePhone } from '../services/phone.service';
import { AccountDeletionRequest } from '../models/AccountDeletionRequest';
import { submitAccountDeletionRequest } from '../services/account-deletion.service';

export const authRouter = Router();

const FirebaseLoginSchema = z.object({
  role: z.enum(['customer', 'partner']),
  firebaseIdToken: z.string().min(20),
  customerProfile: z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email().max(160),
    city: z.string().trim().min(2).max(80)
  }).optional()
});

const CustomerOnboardingStatusSchema = z.object({
  phone: z.string().trim().min(10).max(20)
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
  '/customer-onboarding-status',
  asyncRoute(async (req, res) => {
    const body = CustomerOnboardingStatusSchema.parse(req.body);
    const phone = normalizePhone(body.phone);
    const customer = await User.findOne({ phone, role: 'customer' }).select('name email');
    const needsProfile = !customer || !customer.email || customer.name === 'Indiery Customer';
    res.json({ needsProfile });
  })
);

authRouter.post(
  '/firebase-login',
  asyncRoute(async (req, res) => {
    const body = FirebaseLoginSchema.parse(req.body);
    const verification = await verifyFirebasePhoneToken(body.firebaseIdToken);
    const user = await ensureUser(verification.phone, body.role);
    if (body.role === 'customer' && body.customerProfile) {
      user.name = body.customerProfile.name;
      user.initials = initialsFromName(body.customerProfile.name);
      user.email = body.customerProfile.email;
      user.city = body.customerProfile.city;
      await user.save();
    }
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
    const role = req.auth!.role;
    if (role === 'admin') throw new ApiError(403, 'Forbidden');

    const result = await submitAccountDeletionRequest({
      role,
      name: user.name,
      phone: user.phone,
      email: user.email ?? undefined,
      reason: body.reason,
      source: 'in_app',
      authenticatedUser: user
    });

    res.status(result.created ? 201 : 200).json({
      ok: true,
      status: result.request.status,
      requestId: String(result.request._id)
    });
  })
);

authRouter.get(
  '/account-deletion-request',
  requireAuth(['customer', 'partner']),
  asyncRoute<AuthRequest>(async (req, res) => {
    const request = await AccountDeletionRequest.findOne({ user: req.auth!.userId })
      .sort({ createdAt: -1 })
      .select('status verificationStatus createdAt lastRequestedAt completedAt');

    if (!request) {
      return res.json({ status: 'none' });
    }

    return res.json({
      requestId: String(request._id),
      status: request.status,
      verificationStatus: request.verificationStatus,
      requestedAt: request.createdAt,
      lastRequestedAt: request.lastRequestedAt,
      completedAt: request.completedAt
    });
  })
);
