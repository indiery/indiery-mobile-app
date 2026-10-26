import type { Types } from 'mongoose';
import { ApiError } from '../middleware/error';
import { AccountDeletionRequest } from '../models/AccountDeletionRequest';
import { User, type UserDocument } from '../models/User';
import { normalizePhone } from './phone.service';

type DeletionRole = 'customer' | 'partner';
type DeletionSource = 'in_app' | 'web';

type SubmitAccountDeletionRequestInput = {
  role: DeletionRole;
  source: DeletionSource;
  phone: string;
  name?: string;
  email?: string;
  reason?: string;
  authenticatedUser?: UserDocument;
};

const openStatuses = ['requested', 'reviewing'] as const;

function normalizeDeletionPhone(phone: string) {
  const normalized = normalizePhone(phone);
  if (!/^\d{8,15}$/.test(normalized)) {
    throw new ApiError(400, 'Enter a valid mobile number');
  }
  return normalized;
}

function cleanOptional(value?: string) {
  const cleaned = value?.trim();
  return cleaned || undefined;
}

function openRequestFilter(
  role: DeletionRole,
  phone: string,
  userId: Types.ObjectId | undefined,
  authenticated: boolean
) {
  const identityFilter = userId
    ? {
        $or: [{ user: userId }, { role, phone }]
      }
    : { role, phone };

  return {
    ...identityFilter,
    status: { $in: openStatuses },
    // A public submission must never modify or reuse an already verified
    // in-app request merely because the submitter knows the phone number.
    ...(authenticated ? {} : { verificationStatus: { $ne: 'verified' } })
  };
}

export async function submitAccountDeletionRequest(input: SubmitAccountDeletionRequestInput) {
  const phone = normalizeDeletionPhone(input.phone);
  const authenticated = Boolean(input.authenticatedUser);
  const matchingUser =
    input.authenticatedUser ??
    (await User.findOne({ role: input.role, phone }));
  const now = new Date();
  const filter = openRequestFilter(input.role, phone, matchingUser?._id, authenticated);
  const existing = await AccountDeletionRequest.findOne(filter).sort({ createdAt: -1 });

  if (existing) {
    existing.lastRequestedAt = now;
    existing.requestCount = (existing.requestCount || 1) + 1;

    if (!existing.user && matchingUser) existing.user = matchingUser._id;
    if (!existing.name) existing.name = cleanOptional(input.name) ?? matchingUser?.name;
    if (!existing.email) {
      existing.email = cleanOptional(input.email)?.toLowerCase() ?? matchingUser?.email;
    }
    if (!existing.reason) existing.reason = cleanOptional(input.reason);

    // A signed-in request proves possession of the account session. A public
    // form submission still requires ownership verification by support.
    if (authenticated && existing.verificationStatus !== 'verified') {
      existing.verificationStatus = 'verified';
      existing.verifiedAt = now;
    }

    await existing.save();
    return { request: existing, created: false };
  }

  const request = await AccountDeletionRequest.create({
    role: input.role,
    user: matchingUser?._id,
    name: cleanOptional(input.name) ?? matchingUser?.name,
    phone,
    email: cleanOptional(input.email)?.toLowerCase() ?? matchingUser?.email,
    reason: cleanOptional(input.reason),
    source: input.source,
    verificationStatus: authenticated ? 'verified' : 'pending',
    verifiedAt: authenticated ? now : undefined,
    lastRequestedAt: now
  });

  return { request, created: true };
}
