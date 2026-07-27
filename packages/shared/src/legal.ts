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

const updatedAt = 'July 27, 2026';

export const legalPolicies: LegalPolicy[] = [
  {
    id: 'privacy',
    title: 'Privacy Policy',
    updatedAt,
    summary: 'How Indiery and Indiery Partner access, collect, use, disclose, retain, protect, and delete user data.',
    sections: [
      {
        heading: 'Developer and scope',
        body: [
          'Indiery is the developer and operator of the Indiery customer app, the Indiery Partner app, and the related delivery platform. This Privacy Policy applies to both apps and the related website and support services.',
          'For privacy questions, access or correction requests, account deletion, or grievances, contact our privacy team at support@indiery.in.',
          'This policy should be read together with the Terms of Service and the notices shown immediately before the apps request sensitive permissions.'
        ]
      },
      {
        heading: 'Account and authentication data',
        body: [
          'We collect the name, mobile number, email address, city, account role, language choice, profile status, and support information that a user provides.',
          'Phone authentication is provided through Firebase. We process authentication tokens and security information needed to verify a session and protect an account.',
          'We process device push tokens and notification preferences to send booking, payment, safety, account, and delivery-status messages.'
        ]
      },
      {
        heading: 'Customer booking and location data',
        body: [
          'For customer bookings, we collect pickup, stop, and drop addresses; sender and recipient names and phone numbers; exact coordinates selected or provided by the user; goods type and weight; vehicle choice; fare, discount, wallet, coin, cancellation, refund, and order-history information.',
          'The customer app accesses precise or approximate location only after permission is granted, such as when the user chooses current location or confirms a pickup or drop point. Location is transmitted to provide place search, route calculation, fare estimation, dispatch, and delivery tracking.',
          'Customers should provide another person’s contact details only when authorized to use them for the delivery.'
        ]
      },
      {
        heading: 'Partner, KYC, media, and live location data',
        body: [
          'For delivery partners, we collect profile and vehicle information, vehicle number, verification status, ratings, order activity, wallet and payout records, and bank payout details such as account-holder name, account number, and IFSC.',
          'Partner verification and delivery evidence may include a selfie, PAN, Aadhaar, driving licence, RC, insurance, bank proof, pickup proof, and delivery proof images. Camera or selected-photo access is used only after the partner initiates the relevant capture or upload flow.',
          'When a partner chooses to go online or has an active delivery and grants location permission, the Partner app processes precise location while the app is in use. It is used to offer nearby work, dispatch and manage deliveries, update trip progress, support safety, and show live delivery location to the relevant customer or a person holding the private tracking link.',
          'The apps do not use microphone recordings. Government identification numbers, bank details, authentication secrets, payment credentials, and delivery OTPs are not displayed on public tracking pages.'
        ]
      },
      {
        heading: 'Payments and financial information',
        body: [
          'We process payment mode, amount, provider references, payment status, wallet and coin ledger entries, refunds, partner earnings, payout requests, and related fraud or dispute information.',
          'Razorpay or another disclosed payment provider handles card, bank, or UPI checkout details. Indiery receives transaction references and status needed to verify payment, but does not intend to store full card numbers, CVV values, UPI PINs, or online-banking passwords.',
          'Payment, payout, tax, accounting, fraud-prevention, and dispute records may be retained when required by law or reasonably necessary to establish or defend legal claims.'
        ]
      },
      {
        heading: 'Device, diagnostics, and support data',
        body: [
          'We may process app version, device and operating-system information, network information, notification status, security events, error details, IP-derived approximate information, and support communications needed to operate, secure, diagnose, and improve the service.',
          'We do not sell personal or sensitive user data and do not use it for third-party targeted advertising.'
        ]
      },
      {
        heading: 'How we use data',
        body: [
          'We use data to create and secure accounts; provide estimates and bookings; match customers with partners; process payments, refunds, wallets, and payouts; verify pickup and delivery; provide live tracking and notifications; review KYC; answer support requests; prevent fraud and unsafe conduct; resolve disputes; and comply with tax, accounting, safety, and legal obligations.',
          'We limit access and use to service functionality, security, support, compliance, and other purposes described at the time of collection.'
        ]
      },
      {
        heading: 'When data is disclosed',
        body: [
          'Relevant booking details are disclosed between the customer and assigned partner as needed to complete a delivery. Live partner location may be shown to the customer and through the order’s private tracking link while tracking is active.',
          'We use service providers that process data for authentication, notifications, maps and place search, payment processing, media storage, cloud hosting, database hosting, diagnostics, support, and fraud prevention. These may include Firebase, Expo, Google Maps, Razorpay, Cloudinary, and our hosting and database providers.',
          'We may disclose information to payment partners, banks, insurers, professional advisers, courts, regulators, law-enforcement bodies, or public authorities when reasonably necessary to comply with law, enforce agreements, investigate fraud, or protect users, Indiery, or the public.',
          'Service providers may process information in India or other countries where they operate, subject to contractual, technical, and legal safeguards required by applicable law.'
        ]
      },
      {
        heading: 'Security',
        body: [
          'We use HTTPS encryption in transit, authentication tokens, role-based access controls, protected provider credentials, restricted upload flows, and reasonable administrative and technical safeguards.',
          'No system is completely secure. Users should protect their phone, OTPs, and account access and promptly report suspected unauthorized use to support@indiery.in.'
        ]
      },
      {
        heading: 'Retention and deletion',
        body: [
          'Account and profile data is kept while the account is active. Push tokens are kept while needed for notifications. Operational location, booking, KYC, proof, payment, wallet, payout, safety, support, and audit records are retained only for service, verification, fraud prevention, dispute, tax, accounting, safety, and legal needs.',
          'Users can request deletion from Account settings in either app or from the public account-deletion page. After ownership verification, we process eligible deletion requests without unreasonable delay and may contact the user if more information or a legal retention period is required.',
          'When a deletion request is completed, we delete or irreversibly de-identify account data that is no longer required. Data that must be retained for payment reconciliation, tax, accounting, fraud prevention, safety, dispute resolution, or another legal obligation is restricted to those purposes and deleted or de-identified when the applicable need ends.',
          'Deleting the app from a device does not by itself delete the user’s Indiery account.'
        ]
      },
      {
        heading: 'Choices and rights',
        body: [
          'Users may request access, correction, deletion, or grievance support through the app or by emailing support@indiery.in. We may verify identity before acting on a request.',
          'Users can decline or later disable location, camera, photo, or notification permissions in device settings. The related feature may be unavailable, but unrelated app features should remain accessible where practical.',
          'Users may contact us if they wish to withdraw a previously provided permission or consent; withdrawal does not affect processing already completed lawfully.'
        ]
      },
      {
        heading: 'Children, changes, and contact',
        body: [
          'The service is not directed to children under 18. Delivery partners must be legally eligible to drive and contract for delivery services. A customer who is not legally able to enter a contract must use the service through a parent or legal guardian.',
          'We may update this policy when our services, providers, or legal duties change. We will update the effective date and provide additional notice in the app when a change materially affects user rights or data use.',
          'Privacy contact and grievance channel: support@indiery.in.'
        ]
      }
    ]
  },
  {
    id: 'terms',
    title: 'Terms of Service',
    updatedAt,
    summary: 'The rules governing use of the Indiery customer and partner apps and delivery platform.',
    sections: [
      {
        heading: 'Acceptance and eligibility',
        body: [
          'By creating an account, booking a delivery, accepting work, or otherwise using Indiery, you agree to these Terms and the Privacy Policy.',
          'You must provide accurate information, have legal capacity to use the service, and comply with applicable law. Delivery partners must be at least 18 and hold every licence, registration, insurance, permit, and authorization required for their vehicle and work.',
          'If you do not agree, do not create an account or use the service.'
        ]
      },
      {
        heading: 'Platform role',
        body: [
          'Indiery provides technology for requesting, accepting, paying for, tracking, and managing delivery services.',
          'Unless applicable law or a separate written agreement states otherwise, delivery partners provide delivery services as independent service providers and are responsible for their vehicle, conduct, expenses, taxes, licences, insurance, and legal compliance.',
          'Availability, assignment, route, pickup time, delivery time, and fare estimates can change because of traffic, weather, demand, network conditions, safety, incorrect information, or other operational factors.'
        ]
      },
      {
        heading: 'Accounts and communications',
        body: [
          'Users must keep account access, phones, OTPs, and devices secure and must promptly report suspected unauthorized use.',
          'One person may not impersonate another, create fraudulent accounts, manipulate location or payments, or use the platform to harm another person.',
          'Users agree to receive service communications needed for authentication, bookings, payments, safety, support, policy updates, and delivery status. Notification permissions can be changed in device settings.'
        ]
      },
      {
        heading: 'Customer responsibilities',
        body: [
          'Customers must provide accurate pickup, stop, drop, goods, weight, contact, access, and payment information and must have authority to share sender and recipient contact details.',
          'Goods must be safely packed, accurately described, lawful to transport, and suitable for the selected vehicle. The customer is responsible for declarations, permits, invoices, and special handling information required by law.',
          'Customers and their contacts must be available at pickup and delivery and must not disclose delivery OTPs before the relevant handover.'
        ]
      },
      {
        heading: 'Partner responsibilities',
        body: [
          'Partners must complete required KYC and vehicle verification, maintain accurate bank and vehicle information, drive safely, protect goods, follow lawful routes and traffic rules, and provide genuine pickup and delivery proof.',
          'Partners must not share customer information, private tracking links, delivery OTPs, KYC information, or order details except as needed to complete the delivery or comply with law.',
          'Partners may refuse goods that differ materially from the booking, are unsafe, are inadequately packed, or appear unlawful. Suspected safety or legal issues should be reported to Indiery support.'
        ]
      },
      {
        heading: 'Prohibited and restricted goods',
        body: [
          'Users must not use Indiery for illegal goods, weapons, explosives, flammable or hazardous materials, controlled substances, stolen items, human remains, live animals, cash or negotiable instruments, or any item prohibited by law or platform notice.',
          'Perishable, fragile, confidential, unusually valuable, regulated, or temperature-controlled goods must not be booked unless Indiery expressly supports and the customer accurately discloses the item and handling needs.',
          'Indiery or a partner may refuse, cancel, report, or safely hand over a shipment to authorities when reasonably necessary for safety or legal compliance.'
        ]
      },
      {
        heading: 'Fares, payments, wallets, and payouts',
        body: [
          'The app shows the applicable fare or estimate before confirmation. The final amount may change only where the app discloses an adjustment permitted by these Terms, such as waiting, return, toll, tax, correction, or cancellation charges.',
          'Online payments are processed by a disclosed payment provider. Users authorize Indiery and its provider to create, verify, refund, or reconcile transactions associated with a booking.',
          'Wallet credits and promotional coins are platform balances, are not bank deposits, may be subject to stated eligibility or expiry rules, and are not transferable or redeemable for cash unless applicable law requires otherwise.',
          'Partner earnings and payouts may be adjusted for verified cancellations, refunds, disputes, fraud, duplicate credits, withholding taxes, penalties disclosed in the app, or other lawful corrections.'
        ]
      },
      {
        heading: 'Cancellation, refunds, and disputes',
        body: [
          'The Refund and Cancellation Rules shown in the app form part of these Terms. Any charge should be disclosed before the user confirms it where reasonably possible.',
          'Users should report payment, damage, loss, missing delivery, or incorrect-delivery disputes promptly and provide requested evidence. Indiery may review booking records, OTP verification, proof images, location history, communications, and payment references.',
          'Nothing in these Terms removes a consumer right or remedy that cannot lawfully be excluded.'
        ]
      },
      {
        heading: 'Location, tracking, and proof',
        body: [
          'Location and route information is approximate and may be delayed or unavailable. It must not be used as an emergency or safety-guarantee service.',
          'A customer may share a private tracking link. Anyone receiving that link may see limited order and live driver-location information while tracking is active, so users must share it carefully.',
          'OTP records, timestamps, status events, and pickup or delivery photos may be used as operational evidence, but Indiery may consider other reliable evidence when resolving a dispute.'
        ]
      },
      {
        heading: 'Suspension and termination',
        body: [
          'Indiery may restrict or suspend access to protect users, investigate fraud or unsafe behavior, comply with law, address repeated cancellations or payment failures, or enforce these Terms.',
          'Users may stop using the service at any time and may request account deletion. Obligations and records that by their nature must survive, including payment, dispute, confidentiality, safety, and legal obligations, continue as permitted by law.'
        ]
      },
      {
        heading: 'Disclaimers and liability',
        body: [
          'To the maximum extent permitted by law, the platform is provided on an “as available” basis without a guarantee of uninterrupted access, a particular partner, route, pickup time, delivery time, or outcome.',
          'Indiery is not responsible for loss caused by prohibited or incorrectly declared goods, inadequate packaging, inaccurate addresses or contacts, unauthorized OTP disclosure, user negligence, or events outside reasonable control.',
          'Any exclusion or limitation applies only to the extent permitted by applicable law and does not limit liability that cannot lawfully be limited.'
        ]
      },
      {
        heading: 'Privacy, changes, and governing law',
        body: [
          'The Privacy Policy explains how Indiery handles personal and sensitive data.',
          'We may update these Terms for legal, security, or service changes. The updated date will be shown, and material changes will receive additional notice where required.',
          'These Terms are governed by the laws of India. Courts or tribunals having lawful jurisdiction in India may hear disputes, subject to any mandatory consumer forum or other remedy available under applicable law.',
          'Before starting formal proceedings, users are encouraged to contact support@indiery.in so we can try to resolve the issue.'
        ]
      }
    ]
  },
  {
    id: 'refunds',
    title: 'Refund and Cancellation Rules',
    updatedAt,
    summary: 'How cancellations, refunds, coins, waiting charges, and delivery disputes are handled.',
    sections: [
      {
        heading: 'Before partner acceptance',
        body: [
          'A customer may normally cancel before a partner accepts without a cancellation charge. Any captured prepaid amount and eligible coins are returned through the supported refund method.',
          'A payment authorization that was not captured may disappear according to the bank or payment provider’s processing time.'
        ]
      },
      {
        heading: 'After acceptance or arrival',
        body: [
          'After a partner accepts or travels toward pickup, a clearly disclosed cancellation, travel, or waiting charge may apply where permitted by law.',
          'If the partner cancels, is unavailable, or materially fails to perform, Indiery may reassign or cancel the order without a customer cancellation charge.',
          'Incorrect addresses, unavailable contacts, unsafe goods, failed access, excessive waiting, or a requested return trip may result in additional charges shown or explained before they are applied where reasonably possible.'
        ]
      },
      {
        heading: 'After pickup',
        body: [
          'After pickup, cancellation is normally unavailable unless required for safety, law, partner failure, or a support-approved exception.',
          'A return, re-delivery, storage, disposal, or authority handover may incur reasonable charges where caused by incorrect instructions, an unavailable recipient, prohibited goods, or another user-controlled issue.'
        ]
      },
      {
        heading: 'Refund method and timing',
        body: [
          'Eligible refunds are returned to the original payment method, Indiery wallet, or another method supported and disclosed by the payment provider.',
          'Indiery initiates an approved refund promptly, but the time for a bank, card, UPI provider, or gateway to display it is controlled by that provider.',
          'Eligible promotional coins are normally restored to the account. Promotional credits generally cannot be converted to cash.'
        ]
      },
      {
        heading: 'Claims and evidence',
        body: [
          'Customers should report missing, damaged, or incorrect delivery issues within 48 hours where practical. A delay does not remove a mandatory legal right.',
          'Indiery may review booking details, goods declarations, OTPs, photos, timestamps, location history, support records, and payment references before deciding an adjustment.',
          'Refunds may be denied or reduced where a claim involves prohibited goods, false information, inadequate packaging, unauthorized OTP disclosure, fraud, or loss outside the service’s responsibility, subject to applicable law.'
        ]
      },
      {
        heading: 'Support',
        body: [
          'For a cancellation, refund, duplicate payment, or delivery dispute, contact support@indiery.in with the order number and relevant payment reference. Never send a UPI PIN, CVV, password, or full card number.'
        ]
      }
    ]
  }
];
