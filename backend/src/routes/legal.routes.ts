import { Router } from 'express';
import { z } from 'zod';
import { AccountDeletionRequest } from '../models/AccountDeletionRequest';
import { asyncRoute } from '../middleware/error';

export const legalRouter = Router();

const privacyPolicy = {
  updatedAt: 'July 10, 2026',
  summary: 'How Indiery and Indiery Partner collect, use, store, protect, and share customer and partner data.',
  sections: [
    {
      heading: 'Who we are and how to contact us',
      body: [
        'This Privacy Policy applies to the Indiery customer app and the Indiery Partner app.',
        'For privacy, account deletion, correction, or grievance requests, contact Indiery at support@indiery.in or use the account deletion page linked in the app and on our website.',
        'The developer or business name shown on our Google Play store listings should match this Privacy Policy and the public policy URL.'
      ]
    },
    {
      heading: 'Data we collect',
      body: [
        'We collect account details such as name, phone number, email, city, role, profile status, language choice, and app support details.',
        'For customer bookings we collect pickup, stop, and drop addresses, contact names and phone numbers, goods details, fare estimates, payment mode, wallet or coins activity, order history, cancellation and refund details, device push token, and location coordinates when provided.',
        'For partners we collect vehicle details, vehicle number, KYC document status and uploaded proof images such as selfie, PAN, Aadhaar, driving licence, RC, proof of pickup or delivery photos, live delivery location during active use, wallet ledger, payout requests, and bank payout details.',
        'We may collect technical data needed to run the service, such as authentication tokens, device push tokens, app errors, security events, and approximate network or device information.'
      ]
    },
    {
      heading: 'How we use data',
      body: [
        'We use data to create accounts, estimate fares, assign delivery partners, process orders, verify pickup and drop OTPs, handle payments, support disputes, prevent misuse, and meet legal or tax obligations.',
        'Customer location data is used for pickup and drop selection, fare estimates, route support, and delivery tracking.',
        'Partner location data is used to show nearby orders, assign deliveries, update trip progress, support live tracking, and improve safety during active delivery work.',
        'Camera and image uploads in the partner app are used for KYC verification, vehicle verification, pickup proof, delivery proof, safety, fraud prevention, and dispute handling.'
      ]
    },
    {
      heading: 'Sharing and processors',
      body: [
        'Customer and partner details are shared only as needed to complete a booking, for example customer drop details with the assigned partner and partner identity with the customer.',
        'We use service providers for authentication and OTP, push notifications, maps and place search, payment processing, media storage, backend hosting, analytics or diagnostics, support, fraud prevention, and legal compliance. These may include Firebase, Expo push notifications, Google Maps, Razorpay, Cloudinary, and our hosting or database providers.',
        'We may share information with public authorities, courts, payment partners, banks, insurers, or professional advisers when required by law or to protect users, partners, Indiery, or the public.',
        'We do not sell personal or sensitive user data.'
      ]
    },
    {
      heading: 'Choices and rights',
      body: [
        'Users may request access, correction, deletion, or grievance support in the app, by email at support@indiery.in, or from the Indiery account deletion page.',
        'Some order, tax, payment, fraud prevention, and legal records may be retained where required by law or legitimate business need.',
        'Users can disable app permissions such as notifications, location, or camera in device settings, but some app features may stop working.',
        'Users should keep OTPs and account access secure and tell us if they suspect unauthorized account use.'
      ]
    },
    {
      heading: 'Security and retention',
      body: [
        'We use HTTPS, authentication tokens, role-based access, protected provider credentials, and controlled upload flows for sensitive media.',
        'Account profile data is kept while the account is active. Order, payment, wallet, payout, tax, dispute, fraud prevention, KYC, proof of delivery, and safety records are retained only as long as needed for operations, compliance, dispute handling, tax, accounting, legal obligations, and safety.',
        'When we approve an account deletion request, we delete or de-identify account data that is no longer required. Data that must be kept for legitimate business, safety, fraud prevention, tax, accounting, dispute, or legal reasons may be retained for the required period.'
      ]
    }
  ]
};

const DeletionRequestSchema = z.object({
  role: z.enum(['customer', 'partner']).default('customer'),
  name: z.string().trim().max(120).optional(),
  phone: z.string().trim().min(8).max(20),
  email: z.string().trim().email().optional().or(z.literal('')),
  reason: z.string().trim().max(800).optional()
});

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function page(title: string, body: string) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body{font-family:Arial,sans-serif;margin:0;background:#f8fafc;color:#111827;line-height:1.55}
    main{max-width:860px;margin:0 auto;padding:32px 18px 48px}
    h1{font-size:30px;margin:0 0 8px}
    h2{font-size:19px;margin-top:28px}
    p,li,label{font-size:15px}
    .card{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:20px;margin-top:18px}
    .muted{color:#6b7280}
    input,select,textarea{width:100%;box-sizing:border-box;border:1px solid #d1d5db;border-radius:10px;padding:12px;margin:6px 0 14px;font-size:15px}
    button{background:#7c3aed;color:#fff;border:0;border-radius:10px;padding:12px 16px;font-weight:700}
    a{color:#7c3aed}
  </style>
</head>
<body><main>${body}</main></body>
</html>`;
}

legalRouter.get('/privacy', (_req, res) => {
  const sections = privacyPolicy.sections
    .map(
      (section) => `<section class="card"><h2>${escapeHtml(section.heading)}</h2><ul>${section.body
        .map((line) => `<li>${escapeHtml(line)}</li>`)
        .join('')}</ul></section>`
    )
    .join('');
  res.type('html').send(
    page(
      'Indiery Privacy Policy',
      `<h1>Indiery Privacy Policy</h1>
      <p class="muted">Updated ${escapeHtml(privacyPolicy.updatedAt)}</p>
      <p>${escapeHtml(privacyPolicy.summary)}</p>
      ${sections}
      <section class="card"><h2>Account deletion</h2>
      <p>You can request account deletion in the app or through our public deletion page.</p>
      <p><a href="/account-deletion">Request account deletion</a></p></section>`
    )
  );
});

legalRouter.get('/account-deletion', (_req, res) => {
  res.type('html').send(
    page(
      'Indiery Account Deletion',
      `<h1>Indiery Account Deletion</h1>
      <p class="muted">Use this page to request deletion of an Indiery customer or partner account.</p>
      <section class="card">
        <form method="post" action="/api/legal/account-deletion-requests">
          <label>Account type</label>
          <select name="role"><option value="customer">Customer</option><option value="partner">Partner</option></select>
          <label>Full name</label>
          <input name="name" autocomplete="name" />
          <label>Mobile number used in the app</label>
          <input name="phone" required autocomplete="tel" />
          <label>Email address</label>
          <input name="email" type="email" autocomplete="email" />
          <label>Reason or note</label>
          <textarea name="reason" rows="4"></textarea>
          <button type="submit">Submit deletion request</button>
        </form>
      </section>
      <section class="card">
        <h2>What happens next</h2>
        <p>We review deletion requests for Indiery customer and partner accounts. We may contact you to verify account ownership before processing the request.</p>
        <p>After approval, we delete or de-identify account data that is no longer required for the service.</p>
        <p>Some order, payment, wallet, payout, KYC, proof of delivery, safety, fraud prevention, tax, accounting, dispute, and legal records may be retained where required by law or legitimate business need.</p>
        <p>For help with deletion, correction, or privacy questions, email support@indiery.in.</p>
      </section>`
    )
  );
});

legalRouter.post(
  '/api/legal/account-deletion-requests',
  asyncRoute(async (req, res) => {
    const body = DeletionRequestSchema.parse(req.body);
    await AccountDeletionRequest.create({
      role: body.role,
      name: body.name,
      phone: body.phone,
      email: body.email || undefined,
      reason: body.reason,
      source: 'web'
    });

    if (req.headers.accept?.includes('text/html')) {
      return res.type('html').send(
        page(
          'Deletion request submitted',
          `<h1>Deletion request submitted</h1>
          <section class="card"><p>We received your Indiery account deletion request.</p>
          <p class="muted">Our support team will review it and process eligible deletion as quickly as reasonably possible.</p>
          <p><a href="/privacy">Privacy Policy</a></p></section>`
        )
      );
    }

    return res.status(201).json({ ok: true, status: 'requested' });
  })
);
