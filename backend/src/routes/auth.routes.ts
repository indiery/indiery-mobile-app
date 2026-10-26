import { Router, type Request } from 'express';
import bcrypt from 'bcryptjs';
import { createHash, createHmac, randomBytes } from 'crypto';
import { Types } from 'mongoose';
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
import { AdminIdentity } from '../models/AdminIdentity';
import { AdminAuditEvent } from '../models/AdminAuditEvent';

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
    const body = AdminLoginSchema.parse(req.body);
    const normalizedEmail = body.email.toLowerCase();
    const attemptKey = adminAttemptKey(req, normalizedEmail);
    const now = Date.now();
    const attempt = adminLoginAttempts.get(attemptKey);
    if (attempt?.blockedUntil && attempt.blockedUntil > now) {
      res.setHeader('Retry-After', String(Math.ceil((attempt.blockedUntil - now) / 1000)));
      void AdminAuditEvent.create({ actorEmail: normalizedEmail, action: 'LOGIN_BLOCKED', path: '/api/auth/admin-login', statusCode: 429, outcome: 'failure', requestId: `login-${Date.now()}` })
        .catch((error) => console.error('Unable to persist blocked admin login event', error));
      throw new ApiError(429, 'Too many failed sign-in attempts. Try again later.');
    }

    const isBootstrapAdmin = Boolean(env.ADMIN_EMAIL && env.ADMIN_PASSWORD_HASH && normalizedEmail === env.ADMIN_EMAIL.toLowerCase());
    let identity = isBootstrapAdmin
      ? null
      : await AdminIdentity.findOne({ email: normalizedEmail }).select('+passwordHash');
    const passwordHash = isBootstrapAdmin ? env.ADMIN_PASSWORD_HASH! : identity?.passwordHash;
    // Compare even for unknown emails to reduce account-enumeration timing leaks.
    const passwordMatches = await bcrypt.compare(
      body.password,
      passwordHash || '$2a$10$C6UzMDM.H6dfI/f/IKcEe.7ljrNdNn4t.BqzTCp9jQzA5j3bEqhG2'
    );
    const activeIdentity = Boolean(identity && identity.status === 'active');
    if (!passwordMatches || (!isBootstrapAdmin && !activeIdentity)) {
      const failures = (attempt?.blockedUntil && attempt.blockedUntil <= now ? 0 : attempt?.failures || 0) + 1;
      adminLoginAttempts.set(attemptKey, {
        failures,
        blockedUntil: failures >= ADMIN_LOGIN_MAX_FAILURES ? now + ADMIN_LOGIN_WINDOW_MS : 0
      });
      void AdminAuditEvent.create({
        actorId: identity?.user,
        actorEmail: normalizedEmail,
        action: 'LOGIN_FAILED',
        path: '/api/auth/admin-login',
        statusCode: 401,
        outcome: 'failure',
        requestId: `login-${Date.now()}`
      }).catch((error) => console.error('Unable to persist failed admin login event', error));
      throw new ApiError(401, 'Invalid admin credentials');
    }

    adminLoginAttempts.delete(attemptKey);
    let admin = identity
      ? await User.findOne({ _id: identity.user, role: 'admin' })
      : await User.findOne({ role: 'admin', email: normalizedEmail });
    if (!admin && isBootstrapAdmin) {
      const internalPhone = `admin-${createHash('sha256').update(normalizedEmail).digest('hex').slice(0, 18)}`;
      admin = await User.create({
        role: 'admin',
        name: 'Indiery Administrator',
        initials: 'IA',
        phone: internalPhone,
        email: normalizedEmail,
        status: 'active'
      });
    }
    if (!admin) throw new ApiError(401, 'Invalid admin credentials');
    if (admin.status !== 'active') throw new ApiError(403, 'Admin account is blocked');

    if (isBootstrapAdmin) {
      identity = await AdminIdentity.findOneAndUpdate(
        { user: admin._id },
        {
          $set: {
            email: normalizedEmail,
            name: admin.name,
            roleKey: 'super_admin',
            status: 'active',
            lastLoginAt: new Date()
          },
          $setOnInsert: { cityScope: [] }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } else if (identity) {
      identity.lastLoginAt = new Date();
      await identity.save();
    }

    void AdminAuditEvent.create({
      actorId: admin._id,
      actorEmail: normalizedEmail,
      action: 'LOGIN',
      path: '/api/auth/admin-login',
      statusCode: 200,
      outcome: 'success',
      requestId: `login-${Date.now()}`
    }).catch((error) => console.error('Unable to persist admin login event', error));

    const token = signToken(String(admin._id), 'admin');
    res.cookie(ADMIN_SESSION_COOKIE, token, adminCookieOptions());
    res.json({
      success: true,
      admin: {
        id: String(admin._id),
        name: admin.name,
        email: admin.email,
        role: 'admin',
        roleKey: identity?.roleKey,
        cityScope: identity?.cityScope ?? []
      }
    });
  })
);

const AdminInviteAcceptSchema = z.object({
  token: z.string().min(32).max(200),
  password: z.string().min(12).max(256)
});

authRouter.post('/admin-accept-invite', asyncRoute(async (req, res) => {
  const body = AdminInviteAcceptSchema.parse(req.body);
  const tokenHash = createHmac('sha256', env.JWT_SECRET).update(body.token).digest('hex');
  const invite = await AdminIdentity.findOne({
    invitationTokenHash: tokenHash,
    status: 'invited',
    invitationExpiresAt: { $gt: new Date() }
  }).select('+invitationTokenHash +invitationExpiresAt');
  if (!invite) throw new ApiError(400, 'This administrator invitation is invalid or expired. Ask an administrator to create a new one.');

  const passwordHash = await bcrypt.hash(body.password, 12);
  const accepted = await AdminIdentity.findOneAndUpdate(
    {
      _id: invite._id,
      invitationTokenHash: tokenHash,
      status: 'invited',
      invitationExpiresAt: { $gt: new Date() }
    },
    {
      $set: { status: 'active', passwordHash },
      $unset: { invitationTokenHash: 1, invitationExpiresAt: 1 }
    },
    { new: true }
  );
  if (!accepted) throw new ApiError(400, 'This administrator invitation has already been used or expired.');
  const userUpdate = await User.updateOne({ _id: accepted.user, role: 'admin', status: 'blocked' }, { $set: { status: 'active' } });
  if (userUpdate.modifiedCount !== 1) {
    await AdminIdentity.updateOne({ _id: accepted._id, status: 'active' }, {
      $set: { status: 'invited', invitationTokenHash: tokenHash, invitationExpiresAt: invite.invitationExpiresAt },
      $unset: { passwordHash: 1 }
    });
    throw new ApiError(409, 'The invited account could not be activated. Ask an administrator to retry the invitation.');
  }
  void AdminAuditEvent.create({
    actorId: accepted.user,
    actorEmail: accepted.email,
    action: 'INVITE_ACCEPTED',
    path: '/api/auth/admin-accept-invite',
    statusCode: 200,
    outcome: 'success',
    requestId: `invite-${Date.now()}`
  }).catch((error) => console.error('Unable to persist administrator invitation event', error));
  res.json({ success: true, email: accepted.email });
}));

authRouter.get(
  '/admin-session',
  requireAuth(['admin']),
  asyncRoute<AuthRequest>(async (req, res) => {
    const admin = await User.findOne({ _id: req.auth!.userId, role: 'admin', status: 'active' })
      .select('name email role')
      .lean();
    if (!admin) throw new ApiError(401, 'Admin session is no longer valid');
    const identity = await AdminIdentity.findOne({ user: admin._id, status: 'active' }).select('roleKey cityScope').lean();
    if (!identity) throw new ApiError(401, 'Administrator access is no longer active');
    res.json({ admin: { ...admin, roleKey: identity.roleKey, cityScope: identity.cityScope ?? [] } });
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
    partnerProfile: {
      vehicleId: vehicle?._id,
      vehicleNumber: '',
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
