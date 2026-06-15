import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/indiery'),
  JWT_SECRET: z.string().min(16).default('dev-only-change-before-production'),
  CORS_ORIGIN: z.string().default('*'),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_BASE64: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  EXPO_ACCESS_TOKEN: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_UPLOAD_FOLDER: z.string().default('indiery')
});

export const env = EnvSchema.parse(process.env);

if (
  env.MONGODB_URI.includes('USER:PASSWORD') ||
  env.MONGODB_URI.includes('CLUSTER.mongodb.net') ||
  env.MONGODB_URI.includes('<') ||
  env.MONGODB_URI.includes('>')
) {
  throw new Error(
    'MONGODB_URI still contains placeholder values. Replace USER, PASSWORD, and CLUSTER with your real MongoDB connection string in backend/.env.'
  );
}

const cloudinaryParts = [env.CLOUDINARY_CLOUD_NAME, env.CLOUDINARY_API_KEY, env.CLOUDINARY_API_SECRET].filter(Boolean);
if (cloudinaryParts.length > 0 && cloudinaryParts.length < 3) {
  throw new Error('Cloudinary configuration is incomplete. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET together.');
}

const razorpayParts = [env.RAZORPAY_KEY_ID, env.RAZORPAY_KEY_SECRET, env.RAZORPAY_WEBHOOK_SECRET].filter(Boolean);
if (razorpayParts.length > 0 && razorpayParts.length < 3) {
  throw new Error('Razorpay configuration is incomplete. Set RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, and RAZORPAY_WEBHOOK_SECRET together.');
}

function hasFirebaseAdminCredentials() {
  return Boolean(
    env.FIREBASE_SERVICE_ACCOUNT_BASE64 ||
      (env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) ||
      env.GOOGLE_APPLICATION_CREDENTIALS
  );
}

if (env.NODE_ENV === 'production') {
  if (env.MONGODB_URI.includes('127.0.0.1') || env.MONGODB_URI.includes('localhost')) {
    throw new Error('Production MONGODB_URI must point to your managed MongoDB instance');
  }
  if (env.JWT_SECRET === 'dev-only-change-before-production' || env.JWT_SECRET.length < 32) {
    throw new Error('Production JWT_SECRET must be replaced with at least 32 characters of secret material');
  }
  if (env.CORS_ORIGIN === '*') {
    throw new Error('Production CORS_ORIGIN must be restricted to your app/API origins, not *');
  }
  if (!hasFirebaseAdminCredentials()) {
    throw new Error('Production Firebase Admin credentials are required for Firebase phone login verification');
  }
  if (!env.GOOGLE_MAPS_API_KEY) {
    throw new Error('Production GOOGLE_MAPS_API_KEY is required for fare distance calculation');
  }
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET || !env.RAZORPAY_WEBHOOK_SECRET) {
    throw new Error('Production Razorpay keys and webhook secret are required for prepaid payments');
  }
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw new Error('Production Cloudinary credentials are required for KYC and POD uploads');
  }
  if (!env.EXPO_ACCESS_TOKEN) {
    throw new Error('Production EXPO_ACCESS_TOKEN is required for push notifications');
  }
}
