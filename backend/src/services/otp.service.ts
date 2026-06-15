import bcrypt from 'bcryptjs';

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
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
