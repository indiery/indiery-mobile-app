# Indiery Mobile Platform

Indiery is split into two React Native apps that use the same MongoDB backend:

- `apps/customer`: Indiery Customer app
- `apps/partner`: Indiery Partner app
- `backend`: Express, MongoDB, Socket.IO API
- `packages/shared`: shared API client, types, theme, and business labels

This is built as a production-oriented app foundation. Credentials are intentionally kept in `.env` files and must be set per environment.

## Setup

```bash
npm install
copy backend\.env.example backend\.env
```

For local development, `mongodb://127.0.0.1:27017/indiery` works if MongoDB is running locally. For production, set `NODE_ENV=production`, replace `MONGODB_URI` and `JWT_SECRET`, and restrict `CORS_ORIGIN` to your real HTTPS origins.

If MongoDB is not installed locally, use one of these:

```bash
docker compose up -d mongo
```

or install MongoDB Community Server and start its Windows service.

```bash
npm run dev:backend
npm run dev:customer
npm run dev:partner
```

When testing on a physical phone, set `EXPO_PUBLIC_API_URL` in each app environment to your computer LAN IP, for example:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.10:4000/api
```

## Firebase Phone Login

Customer and partner login uses Firebase Phone Authentication only. The mobile app verifies the OTP with Firebase, sends the Firebase ID token to `POST /api/auth/firebase-login`, and the backend returns the normal Indiery JWT. There is no Twilio, MSG91, or custom SMS login path.

For local testing, add Firebase test phone numbers in Firebase Console:

1. Authentication > Sign-in method > Phone.
2. Enable Phone.
3. Add entries under Phone numbers for testing, for example `+919999999001` with OTP `123456`.

Backend Firebase Admin credentials can be set in `backend/.env` with either:

```bash
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

or:

```bash
FIREBASE_SERVICE_ACCOUNT_BASE64=
```

Download native Firebase config files from Firebase Console before building the apps:

- `apps/customer/google-services.json`
- `apps/customer/GoogleService-Info.plist`
- `apps/partner/google-services.json`
- `apps/partner/GoogleService-Info.plist`

The customer Android native project is already checked in. If you build it directly with `npm run --workspace @indiery/customer android`, also place the customer Android file at `apps/customer/android/app/google-services.json`.

React Native Firebase requires an Expo development build or native build; it will not run inside plain Expo Go.

## Production Push Notifications

Both apps use Expo Push Notifications with separate EAS projects:

- Customer: `@amit96287/indiery-customer`
- Partner: `@amit96287/indiery-partner`

The apps register their Expo push token after login, remove it on logout, and open the relevant order when a notification is tapped. The backend validates token ownership, sends high-priority order alerts, retries transient Expo failures, stores delivery receipt IDs, checks receipts in the background, and removes expired device tokens.

Before the first store build, configure the Firebase `indiery-bebb4` service-account key as the FCM V1 push credential for **both** Android applications in EAS. Configure an APNs key for each EAS project before iOS builds. `EXPO_ACCESS_TOKEN` must also be present in the deployed backend environment. Push notifications must be tested with a development/preview/production build on a physical device; Android push is not available in Expo Go.

Order notifications currently cover driver search/assignment, nearby partner offers, arrival at pickup, pickup, in-transit, delivery, and customer cancellation.

## Included Flows

- Customer Firebase OTP login, booking, fare estimate, Razorpay payment intent and verification API, pickup/drop OTP, live tracking, wallet coins, order history, profile, and in-app legal policies
- Partner Firebase OTP login, KYC-gated availability, authenticated realtime order queue, device location sync, accept/reject, active delivery, Cloudinary pickup/drop POD, pickup/drop OTP verification, status transitions, earnings, payout request queue, KYC upload, and in-app legal policies
- Shared backend order state, MongoDB persistence, Google Maps distance calculation, Razorpay webhook verification, Cloudinary signed uploads, wallet ledger, document status, push-token storage, Expo push adapter, authenticated Socket.IO rooms, and realtime event hooks

The admin dashboard is intentionally excluded from this build.

## Production Configuration

- MongoDB Atlas: `MONGODB_URI`
- JWT secret: `JWT_SECRET` with at least 32 characters
- CORS origins: `CORS_ORIGIN`, comma-separated if needed
- Firebase Admin: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` or `FIREBASE_SERVICE_ACCOUNT_BASE64`
- Google Maps distance: `GOOGLE_MAPS_API_KEY`
- Razorpay payments: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- Expo push: `EXPO_ACCESS_TOKEN`
- Cloudinary uploads: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_UPLOAD_FOLDER`
- Mobile API URL: `EXPO_PUBLIC_API_URL=https://your-api-domain.example/api`
- Customer Android signing properties: `INDIERY_UPLOAD_STORE_FILE`, `INDIERY_UPLOAD_STORE_PASSWORD`, `INDIERY_UPLOAD_KEY_ALIAS`, `INDIERY_UPLOAD_KEY_PASSWORD`

Partner payout requests are recorded and deducted from the partner wallet as `pending_review`; final bank transfer should be handled through your ops process or a future payout integration with verified bank details.

If your MongoDB password contains symbols such as `@`, URL-encode the password before placing it in `MONGODB_URI`.

Legal policy content lives in `packages/shared/src/legal.ts` and is shown inside both mobile apps. Treat it as a starter policy set and have it reviewed for your final company name, address, grievance contact, refund fees, tax handling, and operating jurisdictions before launch.
