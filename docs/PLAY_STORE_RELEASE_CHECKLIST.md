# Indiery Google Play release checklist

Updated: July 27, 2026

This file is the repository-side release checklist for the Indiery customer and
Indiery Partner apps. Re-check every answer against the exact production build
and every enabled third-party SDK before submitting a release.

## Public declarations

- Privacy Policy: `https://indiery-mobile-app-bp9h.onrender.com/privacy`
- Account deletion: `https://indiery-mobile-app-bp9h.onrender.com/account-deletion`
- Terms of Service: `https://indiery-mobile-app-bp9h.onrender.com/terms`
- Refund and cancellation rules:
  `https://indiery-mobile-app-bp9h.onrender.com/refunds`
- Privacy and grievance contact: `support@indiery.in`
- Developer/operator named in the policies: `Indiery`

Before submission:

- Deploy the backend version containing all four routes and verify each URL in
  a signed-out browser. Each page must return `200`, render without a login,
  and remain public, non-geofenced, and non-PDF.
- Confirm that the exact developer name in Play Console is `Indiery`. If the
  store account uses a different legal entity, update every policy and public
  page to that exact entity before submission.
- Confirm the support mailbox is monitored and add any postal address or named
  grievance officer required for the actual operating entity.
- Maintain an operations process that verifies deletion requests and completes
  deletion or irreversible de-identification. The current code securely queues
  and tracks requests; it does not automatically erase MongoDB, Firebase Auth,
  or Cloudinary records.

## Data Safety draft — Indiery customer app

Declare data as collected when it leaves the device, including collection by an
SDK. Verify Play Console's current definitions and service-provider exceptions
before choosing whether the same data is also declared as shared.

| Play data category | Current customer-app use | Main purpose | Required/optional |
| --- | --- | --- | --- |
| Name | Account/profile and booking contacts | Account management; app functionality | Required for account/booking |
| Email address | Customer profile and support | Account management; support | Required by current onboarding |
| Phone number | Firebase phone login, profile, sender/recipient contacts | Authentication; booking; fraud prevention | Required for account; booking contacts depend on order |
| User IDs | Indiery account ID, Firebase identity/session data | Account management; security | Required |
| Address | Pickup, stops, drop, city | Delivery and fare calculation | Required for a booking |
| Approximate location | Current-location and map flows after permission | Pickup/drop selection; routing | Optional permission; feature-limited if declined |
| Precise location | Current-location and map flows after permission | Pickup/drop selection; routing; dispatch | Optional permission; feature-limited if declined |
| Purchase history | Orders, fares, discounts, refunds, wallet and coin ledger | App functionality; accounting; fraud/disputes | Created when using paid/booking features |
| Payment information | Payment mode, amount, Razorpay references and status | Payment processing; fraud prevention | Required only for an online payment |
| App interactions | Booking/status/cancellation and support activity | App functionality; support; fraud/disputes | Created through use |
| Device or other IDs | Push token, authentication/security identifiers | Notifications; security | Used for signed-in/device features |

Customer-app data recipients include the assigned delivery partner where needed
to perform a booking, Firebase for authentication, Expo for push delivery,
Google Maps for map/place/route operations, Razorpay for payment processing,
and the configured hosting/database providers. Check whether each transfer
qualifies for Play's service-provider exception before marking "shared."

The customer app does not intentionally collect microphone audio, contacts,
calendar data, health data, or customer photos in the current production flow.

## Data Safety draft — Indiery Partner app

| Play data category | Current partner-app use | Main purpose | Required/optional |
| --- | --- | --- | --- |
| Name | Account, KYC, bank and delivery profile | Account management; verification; payouts | Required to work as a partner |
| Email address | Profile and support when supplied | Account management; support | Depends on profile |
| Phone number | Firebase phone login and partner contact | Authentication; delivery; security | Required |
| User IDs | Indiery account ID, Firebase identity/session data | Account management; security | Required |
| Address/city | Partner profile and delivery addresses | Account management; delivery | Depends on profile/order |
| Personal identifiers | PAN, Aadhaar, driving licence, RC, insurance and verification status | KYC; safety; fraud prevention; legal compliance | Required where applicable to verification |
| Financial information | Bank holder name, account number, IFSC, earnings, wallet and payouts | Partner payouts; accounting; fraud prevention | Required for payout |
| Approximate location | Online and active-delivery location after permission | Nearby work; dispatch; delivery tracking | Optional permission; online/trip features are limited if declined |
| Precise location | Online and active-delivery location after permission | Nearby work; dispatch; live tracking; safety | Optional permission; online/trip features are limited if declined |
| Photos | Selfie, KYC/vehicle/bank proof, pickup and delivery proof | Verification; delivery evidence; safety; disputes | Required only for the initiated verification/proof flow |
| Purchase history | Orders, earnings, wallet ledger and payout requests | App functionality; accounting; disputes | Created through work/payment use |
| App interactions | Availability, offers, trip status, cancellations and support activity | App functionality; security; fraud/disputes | Created through use |
| Device or other IDs | Push token, authentication/security identifiers | Notifications; security | Used for signed-in/device features |

Partner-app data recipients include the relevant customer for delivery
performance and live tracking, a person holding a private tracking link while
tracking is active, Firebase, Expo, Google Maps, Razorpay where applicable,
Cloudinary for uploaded media, and the configured hosting/database providers.
Check service-provider exceptions before marking a transfer "shared."

The Partner app does not intentionally collect microphone audio, contacts,
calendar data, health data, or background location in the current production
flow.

## Security and deletion answers

- Data is encrypted in transit using HTTPS/WSS in production.
- Both apps provide an in-app account-deletion request under Account settings.
- The public deletion route works without signing in and explains what is
  deleted/de-identified and what may be retained.
- Public requests require ownership verification. Signed-in requests are
  recorded as verified.
- Do not state that deletion is automatic. Assign staff to the request queue
  and document completion, retained-data reasons, and completion dates.
- Restrict Google Maps, Firebase, Razorpay, Cloudinary, signing, and server keys
  to the minimum required apps/APIs and keep server secrets out of mobile
  bundles.

## Final Play Console checks

- Upload the rebuilt release AAB, not an older APK/AAB with stale permissions.
- In App content, complete Data safety separately for Customer and Partner.
- Set Ads to "No" unless an advertising SDK or ad feature is added.
- Provide reviewer App access instructions for OTP-protected screens.
- Complete Content rating, Target audience, News, Financial features, and any
  other declarations according to the live service.
- Use the public privacy-policy and account-deletion URLs above.
- Confirm the store listing, screenshots, permission declarations, and policy
  wording describe only features available in the submitted build.
- Run closed testing and exercise permission denial, payment failure, duplicate
  taps, booking cancellation, account-deletion submission, and process death
  before production rollout.
