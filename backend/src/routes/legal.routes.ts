import { Router } from 'express';
import { z } from 'zod';
import { AccountDeletionRequest } from '../models/AccountDeletionRequest';
import { asyncRoute } from '../middleware/error';

export const legalRouter = Router();

const privacyPolicy = {
  updatedAt: 'June 8, 2026',
  summary: 'How Indiery collects, uses, stores, and shares customer and partner data.',
  sections: [
    {
      heading: 'Data we collect',
      body: [
        'We collect account details such as name, phone number, email, city, role, and profile status.',
        'For customer bookings we collect pickup and drop addresses, contact details, goods details, payment mode, order history, device push token, and location coordinates when provided.',
        'For partners we collect vehicle details, KYC document status, uploaded proof images, live delivery location, wallet ledger, payout requests, and POD photos.'
      ]
    },
    {
      heading: 'How we use data',
      body: [
        'We use data to create accounts, estimate fares, assign delivery partners, process orders, verify pickup and drop OTPs, handle payments, support disputes, prevent misuse, and meet legal or tax obligations.',
        'Location data is used for fare estimates, partner assignment, live tracking, route support, and safety checks during active deliveries.'
      ]
    },
    {
      heading: 'Sharing and processors',
      body: [
        'Customer and partner details are shared only as needed to complete a booking, for example customer drop details with the assigned partner and partner identity with the customer.',
        'We may use service providers for cloud storage, maps, SMS OTP, push notifications, payments, analytics, support, and fraud prevention.',
        'We may share information with public authorities when required by law or to protect users, partners, Indiery, or the public.'
      ]
    },
    {
      heading: 'Choices and rights',
      body: [
        'Users may request access, correction, deletion, or grievance support in the app or from the account deletion page.',
        'Some order, tax, payment, fraud prevention, and legal records may be retained where required by law or legitimate business need.',
        'Users can disable app permissions such as notifications or location in device settings, but some app features may stop working.'
      ]
    },
    {
      heading: 'Security and retention',
      body: [
        'We use role-based access, authentication tokens, encrypted provider credentials, and signed upload flows for sensitive media.',
        'KYC, POD, and order records are retained only as long as needed for operations, compliance, dispute handling, tax, accounting, and safety.'
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
        <p>We review deletion requests and delete account data that is no longer required for operations, fraud prevention, disputes, tax, accounting, or legal compliance.</p>
        <p>Some order, payment, KYC, safety, and legal records may be retained where required by law or legitimate business need.</p>
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
