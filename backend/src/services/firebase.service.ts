import { applicationDefault, cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { env } from '../config/env';
import { ApiError } from '../middleware/error';
import { normalizePhone } from './phone.service';

function serviceAccountFromBase64() {
  if (!env.FIREBASE_SERVICE_ACCOUNT_BASE64) return undefined;
  const json = Buffer.from(env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
  return JSON.parse(json) as ServiceAccount;
}

function serviceAccountFromParts(): ServiceAccount | undefined {
  if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) return undefined;
  return {
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  };
}

function getFirebaseAuth() {
  const existingApp = getApps()[0];
  if (existingApp) return getAuth(existingApp);

  const serviceAccount = serviceAccountFromBase64() ?? serviceAccountFromParts();
  if (serviceAccount) {
    return getAuth(initializeApp({ credential: cert(serviceAccount) }));
  }

  if (env.GOOGLE_APPLICATION_CREDENTIALS || env.FIREBASE_PROJECT_ID) {
    return getAuth(
      initializeApp({
        credential: applicationDefault(),
        projectId: env.FIREBASE_PROJECT_ID
      })
    );
  }

  throw new ApiError(500, 'Firebase Admin credentials are not configured');
}

export async function verifyFirebasePhoneToken(firebaseIdToken: string) {
  try {
    const decoded = await getFirebaseAuth().verifyIdToken(firebaseIdToken);
    if (!decoded.phone_number) {
      throw new ApiError(401, 'Firebase token does not contain a verified phone number');
    }

    return {
      uid: decoded.uid,
      phone: normalizePhone(decoded.phone_number)
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(401, 'Invalid Firebase login token');
  }
}
