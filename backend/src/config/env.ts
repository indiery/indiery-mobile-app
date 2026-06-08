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
  RAZORPAY_PAYOUT_ACCOUNT: z.string().optional(),
  MSG91_AUTH_KEY: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_PHONE: z.string().optional(),
  EXPO_ACCESS_TOKEN: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_UPLOAD_FOLDER: z.string().default('indiery'),
  DEMO_CUSTOMER_PHONE: z.string().default('9876543210'),
  DEMO_PARTNER_PHONE: z.string().default('9123456789')
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

if (env.NODE_ENV === 'production') {
  if (env.MONGODB_URI.includes('127.0.0.1')) {
    throw new Error('Production MONGODB_URI must point to your managed MongoDB instance');
  }
  if (env.JWT_SECRET === 'dev-only-change-before-production') {
    throw new Error('Production JWT_SECRET must be replaced');
  }
}
