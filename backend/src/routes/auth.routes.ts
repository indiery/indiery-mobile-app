import { Router } from 'express';
import { z } from 'zod';
import { User } from '../models/User';
import { Vehicle } from '../models/Vehicle';
import { signToken } from '../middleware/auth';
import { env } from '../config/env';
import { asyncRoute, ApiError } from '../middleware/error';
import { seedCoreData } from '../services/seed.service';
import { serializeUser } from '../services/serialize.service';
import { requestLoginOtp, verifyLoginOtp } from '../services/otp.service';

export const authRouter = Router();

const OtpRoleSchema = z.object({
  role: z.enum(['customer', 'partner']),
  phone: z.string().min(6)
});

async function ensureUser(phone: string, role: 'customer' | 'partner') {
  const existing = await User.findOne({ phone, role });
  if (existing) return existing;

  if (role === 'customer') {
    return User.create({
      role,
      phone,
      name: 'Indiery Customer',
      initials: 'IC',
      city: 'Lucknow',
      customerProfile: {
        coins: 0,
        savedAddresses: []
      }
    });
  }

  const vehicle = await Vehicle.findOne({ active: true }).sort({ capacityKg: 1 });
  return User.create({
    role,
    phone,
    name: 'Indiery Partner',
    initials: 'IP',
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
        drivingLicence: false,
        rc: false,
        insurance: false,
        bank: false
      }
    }
  });
}

authRouter.post(
  '/demo',
  asyncRoute(async (req, res) => {
    const body = z.object({ role: z.enum(['customer', 'partner']) }).parse(req.body);
    await seedCoreData();
    const phone = body.role === 'customer' ? env.DEMO_CUSTOMER_PHONE : env.DEMO_PARTNER_PHONE;
    const user = await User.findOne({ phone, role: body.role });
    if (!user) throw new ApiError(404, 'Demo user not found');
    const token = signToken(String(user._id), body.role);
    res.json({ token, user: serializeUser(user) });
  })
);

authRouter.post(
  '/request-otp',
  asyncRoute(async (req, res) => {
    const body = OtpRoleSchema.parse(req.body);
    await seedCoreData();
    const challenge = await requestLoginOtp(body.phone, body.role);
    res.json({
      phone: challenge.phone,
      expiresAt: challenge.expiresAt,
      devOtp: challenge.devOtp
    });
  })
);

authRouter.post(
  '/verify-otp',
  asyncRoute(async (req, res) => {
    const body = OtpRoleSchema.extend({ otp: z.string().min(4) }).parse(req.body);
    await seedCoreData();
    const verification = await verifyLoginOtp(body.phone, body.role, body.otp);
    if (!verification.ok) throw new ApiError(400, 'Invalid or expired OTP');
    const user = await ensureUser(verification.phone, body.role);
    const token = signToken(String(user._id), body.role);
    res.json({ token, user: serializeUser(user) });
  })
);
