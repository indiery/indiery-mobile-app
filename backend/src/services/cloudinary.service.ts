import crypto from 'crypto';
import { env } from '../config/env';
import { ApiError } from '../middleware/error';

export type UploadPurpose = 'pod' | 'kyc' | 'profile';

export interface CloudinarySignatureInput {
  userId: string;
  role: 'customer' | 'partner' | 'admin';
  purpose: UploadPurpose;
  orderId?: string;
  documentKey?: string;
}

export function cloudinaryConfigured() {
  return Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
}

function serializeForSignature(params: Record<string, string | number | undefined>) {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
}

export function createCloudinaryUploadSignature(input: CloudinarySignatureInput) {
  const timestamp = Math.floor(Date.now() / 1000);
  const folderParts = [
    env.CLOUDINARY_UPLOAD_FOLDER,
    input.purpose,
    input.role,
    input.userId,
    input.orderId,
    input.documentKey
  ].filter(Boolean);
  const folder = folderParts.join('/');
  const tags = ['indiery', input.purpose, input.role].join(',');

  if (!cloudinaryConfigured()) throw new ApiError(503, 'Cloudinary uploads are not configured');

  const signedParams = {
    folder,
    tags,
    timestamp
  };
  const stringToSign = `${serializeForSignature(signedParams)}${env.CLOUDINARY_API_SECRET}`;
  const signature = crypto.createHash('sha1').update(stringToSign).digest('hex');

  return {
    configured: true,
    provider: 'cloudinary' as const,
    cloudName: env.CLOUDINARY_CLOUD_NAME!,
    apiKey: env.CLOUDINARY_API_KEY!,
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    folder,
    tags,
    timestamp,
    signature
  };
}
