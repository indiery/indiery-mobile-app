export interface LegalPolicy {
  id: 'privacy' | 'terms' | 'refunds';
  title: string;
  updatedAt: string;
  summary: string;
  sections: Array<{
    heading: string;
    body: string[];
  }>;
}

export const legalPolicies: LegalPolicy[] = [
  {
    id: 'privacy',
    title: 'Privacy Policy',
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
  },
  {
    id: 'terms',
    title: 'Terms of Service',
    updatedAt: 'June 8, 2026',
    summary: 'Rules for using Indiery customer and partner services.',
    sections: [
      {
        heading: 'Platform role',
        body: [
          'Indiery provides a technology platform for booking, accepting, tracking, and managing local logistics services.',
          'Customers are responsible for providing accurate pickup, drop, goods, contact, and payment information.',
          'Partners are responsible for maintaining valid documents, vehicle fitness, safe driving, order handling, and delivery proof.'
        ]
      },
      {
        heading: 'Accounts and verification',
        body: [
          'Users must provide accurate information and keep OTPs, accounts, and devices secure.',
          'Partners may be required to complete KYC, vehicle verification, bank details, and document review before receiving orders or payouts.',
          'Indiery may suspend or restrict accounts for suspected fraud, unsafe conduct, repeated cancellations, false information, or legal risk.'
        ]
      },
      {
        heading: 'Orders and restricted goods',
        body: [
          'Customers must not book prohibited, illegal, dangerous, hazardous, flammable, perishable without disclosure, high-value without approval, or restricted goods.',
          'Partners may refuse pickup if goods do not match booking details, appear unsafe, or violate law or platform rules.',
          'Pickup and drop OTPs, POD images, and order status events may be used as delivery evidence.'
        ]
      },
      {
        heading: 'Payments and payouts',
        body: [
          'Fares, taxes, discounts, cancellation fees, and partner net earnings are shown in the app or backend records.',
          'Customer payments may be processed by third-party payment providers. Partner payouts may be held for verification, disputes, fraud checks, or compliance.',
          'Indiery may correct ledger errors, reverse invalid credits, or withhold amounts linked to disputes or policy violations.'
        ]
      },
      {
        heading: 'Limitations',
        body: [
          'Service availability, estimated pickup time, delivery time, route, fare, and partner availability can change due to traffic, weather, network issues, demand, compliance, or safety.',
          'Indiery is not responsible for losses caused by incorrect booking details, prohibited goods, unreachable contacts, user negligence, or events outside reasonable control.'
        ]
      }
    ]
  },
  {
    id: 'refunds',
    title: 'Refund and Cancellation Rules',
    updatedAt: 'June 8, 2026',
    summary: 'How cancellations, refunds, coins, and delivery disputes are handled.',
    sections: [
      {
        heading: 'Customer cancellation',
        body: [
          'Before a partner accepts the order, cancellation is normally free and prepaid amounts are returned to the original payment method or Indiery wallet.',
          'After partner acceptance and before pickup, a cancellation charge may apply to compensate partner travel and platform costs. The charge should be shown before confirmation where possible.',
          'After pickup, the order usually cannot be cancelled except for safety, legal, partner failure, or support-approved cases.'
        ]
      },
      {
        heading: 'Partner cancellation or failure',
        body: [
          'If a partner cancels, is unreachable, or fails to complete pickup, Indiery may reassign the order or cancel without customer cancellation charge.',
          'If delivery fails because the customer, pickup contact, drop contact, or address is unreachable or incorrect, additional waiting, return, or cancellation charges may apply.'
        ]
      },
      {
        heading: 'Refund processing',
        body: [
          'Eligible refunds are sent to the original payment method, Indiery wallet, or other method supported by the payment provider.',
          'Bank, card, UPI, or payment gateway settlement timelines may vary. Failed or duplicate payments are investigated using provider transaction references.',
          'Indiery coins used on a cancelled eligible order are normally returned to the customer account unless fraud or abuse is detected.'
        ]
      },
      {
        heading: 'Disputes and proof',
        body: [
          'Customers should report missing, damaged, or incorrect delivery issues within 48 hours of delivery when possible.',
          'Indiery may review OTP verification, POD photos, partner location history, chat/support notes, and payment records while deciding refunds or adjustments.',
          'Refunds for restricted goods, false declarations, or unsupported high-value claims may be denied.'
        ]
      }
    ]
  }
];
