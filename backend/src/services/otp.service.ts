import bcrypt from 'bcryptjs';
import { OtpChallenge } from '../models/OtpChallenge';
import { sendSms } from './notification.service';

const OTP_TTL_MINUTES = 10;

function normalizePhone(phone: string) {
  return phone.replace(/[^\d+]/g, '').replace(/^(\+91)/, '');
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function requestLoginOtp(phoneInput: string, role: 'customer' | 'partner') {
  const phone = normalizePhone(phoneInput);
  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await OtpChallenge.updateMany({ phone, role, purpose: 'login', consumedAt: { $exists: false } }, { consumedAt: new Date() });
  await OtpChallenge.create({ phone, role, purpose: 'login', otpHash, expiresAt });
  const sms = await sendSms(phone, `Your Indiery ${role} OTP is ${otp}. It expires in ${OTP_TTL_MINUTES} minutes.`);

  return {
    phone,
    expiresAt,
    devOtp: sms.provider === 'dev' ? otp : undefined
  };
}

export async function verifyLoginOtp(phoneInput: string, role: 'customer' | 'partner', otp: string) {
  const phone = normalizePhone(phoneInput);
  const challenge = await OtpChallenge.findOne({
    phone,
    role,
    purpose: 'login',
    consumedAt: { $exists: false },
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });

  if (!challenge) return { phone, ok: false };
  const ok = await bcrypt.compare(otp, challenge.otpHash);
  if (!ok) return { phone, ok: false };
  challenge.consumedAt = new Date();
  await challenge.save();
  return { phone, ok: true };
}

export function makeTripOtp() {
  return generateOtp();
}

export async function hashOtp(otp: string) {
  return bcrypt.hash(otp, 10);
}

export async function compareOtp(otp: string, hash?: string) {
  if (!hash) return false;
  return bcrypt.compare(otp, hash);
}
