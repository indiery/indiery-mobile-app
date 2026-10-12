import { Router, type Request } from 'express';
import bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { z } from 'zod';
import { User } from '../models/User';
import { Vehicle } from '../models/Vehicle';
import { ADMIN_SESSION_COOKIE, requireAuth, signToken, type AuthRequest } from '../middleware/auth';
import { asyncRoute, ApiError } from '../middleware/error';
import { serializeUser } from '../services/serialize.service';
import { verifyFirebasePhoneToken } from '../services/firebase.service';
import { initialsFromName } from '../services/profile.service';
import { normalizePhone } from '../services/phone.service';
import { AccountDeletionRequest } from '../models/AccountDeletionRequest';
import { submitAccountDeletionRequest } from '../services/account-deletion.service';
import { env } from '../config/env';

export const authRouter = Router();

const adminLoginAttempts = new Map<string, { failures: number; blockedUntil: number }>();
const ADMIN_LOGIN_WINDOW_MS = 15 * 60 * 1000;
const ADMIN_LOGIN_MAX_FAILURES = 5;

const AdminLoginSchema = z.object({
  email: z.string().trim().email().max(160),
  password: z.string().min(8).max(256)
});

function adminAttemptKey(req: Request, email: string) {
  return `${req.ip || req.socket?.remoteAddress || 'unknown'}:${email.toLowerCase()}`;
}

function adminCookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 8 * 60 * 60 * 1000,
    path: '/'
  };
}

authRouter.post(
  '/admin-login',
  asyncRoute(async (req, res) => {
    if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD_HASH) {
      throw new ApiError(503, 'Admin login is not configured');
    }

    const body = AdminLoginSchema.parse(req.body);
    const normalizedEmail = body.email.toLowerCase();
    const attemptKey = adminAttemptKey(req, normalizedEmail);
    const now = Date.now();
    const attempt = adminLoginAttempts.get(attemptKey);
    if (attempt?.blockedUntil && attempt.blockedUntil > now) {
      res.setHeader('Retry-After', String(Math.ceil((attempt.blockedUntil - now) / 1000)));
      throw new ApiError(429, 'Too many failed sign-in attempts. Try again later.');
    }

    // Always perform the password comparison before rejecting the email so login
    // timing does not reveal which administrator address is configured.
    const passwordMatches = await bcrypt.compare(body.password, env.ADMIN_PASSWORD_HASH);
    const emailMatches = normalizedEmail === env.ADMIN_EMAIL.toLowerCase();
    if (!passwordMatches || !emailMatches) {
      const failures = (attempt?.blockedUntil && attempt.blockedUntil <= now ? 0 : attempt?.failures || 0) + 1;
      adminLoginAttempts.set(attemptKey, {
        failures,
        blockedUntil: failures >= ADMIN_LOGIN_MAX_FAILURES ? now + ADMIN_LOGIN_WINDOW_MS : 0
      });
      throw new ApiError(401, 'Invalid admin credentials');
    }

    adminLoginAttempts.delete(attemptKey);
    let admin = await User.findOne({ role: 'admin', email: normalizedEmail });
    if (!admin) {
      const internalPhone = `admin-${createHash('sha256').update(normalizedEmail).digest('hex').slice(0, 18)}`;
      admin = await User.create({
        role: 'admin',
        name: 'Indiery Administrator',
        initials: 'IA',
        phone: internalPhone,
        email: normalizedEmail,
        city: 'Lucknow',
        status: 'active'
      });
    }
    if (admin.status !== 'active') throw new ApiError(403, 'Admin account is blocked');

    const token = signToken(String(admin._id), 'admin');
    res.cookie(ADMIN_SESSION_COOKIE, token, adminCookieOptions());
    res.json({
      success: true,
      admin: { id: String(admin._id), name: admin.name, email: admin.email, role: admin.role }
    });
  })
);

authRouter.get(
  '/admin-session',
  requireAuth(['admin']),
  asyncRoute<AuthRequest>(async (req, res) => {
    const admin = await User.findOne({ _id: req.auth!.userId, role: 'admin', status: 'active' })
      .select('name email role')
      .lean();
    if (!admin) throw new ApiError(401, 'Admin session is no longer valid');
    res.json({ admin });
  })
);

authRouter.post('/admin-logout', (_req, res) => {
  res.clearCookie(ADMIN_SESSION_COOKIE, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });
  res.json({ success: true });
});

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
