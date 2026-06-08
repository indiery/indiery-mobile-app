# Indiery Mobile Platform

Indiery is split into two React Native apps that use the same MongoDB backend:

- `apps/customer`: Indiery Customer app
- `apps/partner`: Indiery Partner app
- `backend`: Express, MongoDB, Socket.IO API
- `packages/shared`: shared API client, types, theme, and business labels

This is built as a real app foundation. Credentials are intentionally kept in `.env` files and can be added later.

## Setup

```bash
npm install
copy backend\.env.example backend\.env
```

For local development, `mongodb://127.0.0.1:27017/indiery` works if MongoDB is running locally. For production, replace `MONGODB_URI` and `JWT_SECRET` with real credentials.

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

## Included Flows

- Customer OTP/demo login, booking, fare estimate, payment intent, pickup/drop OTP, live tracking, wallet coins, order history, profile, and in-app legal policies
- Partner OTP/demo login, availability, device location sync, order queue, accept/reject, active delivery, Cloudinary-ready pickup/drop POD, pickup/drop OTP verification, status transitions, earnings, payout request, KYC, and in-app legal policies
- Shared backend order state, MongoDB persistence, Google Maps distance fallback, Razorpay-ready payment adapter, Cloudinary signed uploads, wallet ledger, document status, push-token storage, Expo push adapter, and realtime event hooks

The admin dashboard is intentionally excluded from this build.

## Credentials To Add Later

- MongoDB Atlas: `MONGODB_URI`
- JWT secret: `JWT_SECRET`
- Google Maps distance: `GOOGLE_MAPS_API_KEY`
- Razorpay payments: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- Razorpay payouts: `RAZORPAY_PAYOUT_ACCOUNT`
- SMS OTP: `MSG91_AUTH_KEY` or `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_PHONE`
- Expo push: `EXPO_ACCESS_TOKEN`
- Cloudinary uploads: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_UPLOAD_FOLDER`

If your MongoDB password contains symbols such as `@`, URL-encode the password before placing it in `MONGODB_URI`.

Legal policy content lives in `packages/shared/src/legal.ts` and is shown inside both mobile apps. Treat it as a starter policy set and have it reviewed for your final company name, address, grievance contact, refund fees, tax handling, and operating jurisdictions before launch.
