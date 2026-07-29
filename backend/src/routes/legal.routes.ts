import { Router } from 'express';
import { z } from 'zod';
import { asyncRoute } from '../middleware/error';
import { submitAccountDeletionRequest } from '../services/account-deletion.service';

export const legalRouter = Router();

type LegalPolicy = {
  title: string;
  updatedAt: string;
  summary: string;
  sections: Array<{ heading: string; body: string[] }>;
};

const updatedAt = 'July 29, 2026';

const privacyPolicy: LegalPolicy = {
  title: 'Customer Privacy Policy',
  updatedAt,
  summary:
    'How Indiery handles personal data when customers use the customer app, website, delivery, payment, tracking, and support services.',
  sections: [
    {
      heading: 'Developer and scope',
      body: [
        'Indiery is the developer and operator of the Indiery Customer app and related delivery platform. This Customer Privacy Policy applies to the customer app, website, tracking, account-deletion, and customer-support services.',
        'For privacy questions, access or correction requests, account deletion, or grievances, contact support@indiery.com.',
        'This policy should be read with the Customer Terms and Conditions and the notice shown immediately before the Customer app requests a sensitive permission.'
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
        'Customers should provide another person\'s contact details only when authorized to use them for the delivery.'
      ]
    },
    {
      heading: 'Driver Partner information and live tracking',
      body: [
        'For an assigned delivery, customers may see the Driver Partner name, phone number, rating, vehicle information, order status, and current delivery location needed to coordinate and track the service.',
        'When a Driver Partner is online or has an active delivery and grants foreground location permission, location may be shown to the relevant customer and through the order private tracking link. The Partner app does not request background location.',
        'Government identification records, bank details, authentication secrets, payment credentials, and delivery OTPs are not displayed to customers or on public tracking pages. Driver Partner data is governed in more detail by the separate Driver Partner Privacy Policy.'
      ]
    },
    {
      heading: 'Payments and financial information',
      body: [
        'We process customer payment mode, amount, provider references, payment status, wallet and coin ledger entries, cancellation charges, waiting charges, refunds, and related fraud or dispute information.',
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
        'We use customer data to create and secure accounts; provide estimates and bookings; match customers with Driver Partners; process payments, refunds, wallets, and Coins; verify pickup and delivery; provide live tracking and notifications; answer support requests; prevent fraud and unsafe conduct; resolve disputes; and comply with tax, accounting, safety, and legal obligations.',
        'We limit access and use to service functionality, security, support, compliance, and other purposes described at the time of collection.'
      ]
    },
    {
      heading: 'When data is disclosed',
      body: [
        'Relevant booking details are disclosed between the customer and assigned partner as needed to complete a delivery. Live partner location may be shown to the customer and through the order\'s private tracking link while tracking is active.',
        'We use service providers for authentication, notifications, maps and place search, payment processing, media storage, cloud hosting, database hosting, diagnostics, support, and fraud prevention. These may include Firebase, Expo, Google Maps, Razorpay, Cloudinary, and our hosting and database providers.',
        'We may disclose information to payment partners, banks, insurers, professional advisers, courts, regulators, law-enforcement bodies, or public authorities when reasonably necessary to comply with law, enforce agreements, investigate fraud, or protect users, Indiery, or the public.',
        'Service providers may process information in India or other countries where they operate, subject to safeguards required by applicable law.'
      ]
    },
    {
      heading: 'Security',
      body: [
        'We use HTTPS encryption in transit, authentication tokens, role-based access controls, protected provider credentials, restricted upload flows, and reasonable administrative and technical safeguards.',
        'No system is completely secure. Users should protect their phone, OTPs, and account access and promptly report suspected unauthorized use to support@indiery.com.'
      ]
    },
    {
      heading: 'Retention and deletion',
      body: [
        'Account and profile data is kept while the account is active. Operational location, booking, proof, payment, wallet, safety, support, and audit records are retained only for service, verification, fraud prevention, dispute, tax, accounting, safety, and legal needs.',
        'Customers can request deletion from Account settings in the Customer app or from the public account-deletion page. After ownership verification, we process eligible deletion requests without unreasonable delay and may contact the customer if more information or a legal retention period is required.',
        'When a request is completed, we delete or irreversibly de-identify account data that is no longer required. Data retained for payment reconciliation, tax, accounting, fraud prevention, safety, dispute resolution, or another legal obligation is restricted to those purposes and deleted or de-identified when the applicable need ends.',
        'Deleting the app from a device does not by itself delete the user\'s Indiery account.'
      ]
    },
    {
      heading: 'Choices, children, changes, and contact',
      body: [
        'Users may request access, correction, deletion, or grievance support through the app or by emailing support@indiery.com. We may verify identity before acting on a request.',
        'Customers can decline or later disable location or notification permissions in device settings. The related feature may be unavailable, but unrelated app features remain accessible where practical.',
        'The customer service is not directed to children under 18. A customer who is not legally able to enter a contract must use the service through a parent or legal guardian.',
        'We may update this policy when our services, providers, or legal duties change. We will update the effective date and provide additional notice when a change materially affects user rights or data use.'
      ]
    }
  ]
};

const partnerPrivacyPolicy: LegalPolicy = {
  title: 'Driver Partner Privacy Policy',
  updatedAt,
  summary:
    'How Indiery handles personal data when Driver Partners register, complete KYC, go online, accept deliveries, share live location, receive earnings, and request payouts.',
  sections: [
    {
      heading: 'Developer and scope',
      body: [
        'Indiery is the developer and operator of the Indiery Partner app and related delivery platform. Driver and Partner mean the same delivery-partner role in this policy.',
        'This policy applies to Driver Partner registration, authentication, KYC, vehicle verification, online availability, delivery activity, live tracking, earnings, wallet, payout, support, and account-deletion services.',
        'For privacy questions, access or correction requests, account deletion, or grievances, contact support@indiery.com.'
      ]
    },
    {
      heading: 'Account and authentication data',
      body: [
        'We collect information a Driver Partner provides, including name, mobile number, email address, city, language choice, profile status, and support information.',
        'Phone authentication is provided through Firebase. We process OTP status, authentication tokens, session-security information, device push tokens, and notification preferences needed to verify and protect the account and send delivery, payment, safety, and account messages.',
        'Driver Partners must be at least 18 and legally eligible to contract, drive, and perform the selected delivery work.'
      ]
    },
    {
      heading: 'KYC, identity, vehicle, and media data',
      body: [
        'KYC and verification may include a selfie and images or details relating to PAN, Aadhaar, driving licence, vehicle registration certificate, insurance, and bank proof. We also process document-completion flags, document URLs, and KYC status such as not started, pending, verified, or rejected.',
        'Vehicle information may include vehicle category, vehicle identifier, registration number, insurance status, photographs, and other licence, permit, or eligibility information required for the work.',
        'Camera or selected-photo access is used only after the Driver Partner starts the relevant capture or upload flow. Uploaded KYC and proof images may be stored through a media provider such as Cloudinary.',
        'The app does not use microphone recordings.'
      ]
    },
    {
      heading: 'Bank, wallet, earnings, and payout data',
      body: [
        'For bank setup, Indiery receives the account-holder name, account number, and IFSC submitted by the Driver Partner. The current account record stores a masked account number, the last four digits, and IFSC rather than the full account number.',
        'We process Partner wallet balance, wallet top-ups, payment-provider references, ledger credits and debits, COD cash collected, online and Coin-funded settlements, waiting and cancellation payouts, weekly completed orders, delivery penalties, payout requests, payout status, and related reconciliation records.',
        'A minimum wallet balance may be required to receive new orders. Wallet and payout records may be adjusted for cash collected, commissions, verified cancellations, refunds, delay penalties, fraud, duplicate entries, disputes, taxes, or other lawful corrections.',
        'Razorpay or another disclosed provider handles payment checkout. Indiery does not intend to collect or store UPI PINs, card PINs, CVVs, full card numbers, online-banking passwords, or similar secret payment credentials.'
      ]
    },
    {
      heading: 'Foreground location and live tracking',
      body: [
        'When a Driver Partner goes online or has an active delivery and grants permission, the Partner app processes precise foreground location while the app is in use. The app does not request background location.',
        'Location records may include latitude, longitude, heading, speed, and update time. During an active trip, the app normally requests updates periodically or after meaningful movement so that Indiery can dispatch work, update the trip, support safety, and provide customer tracking.',
        'During an active delivery, the relevant customer and a person holding the private tracking link may see the Driver Partner current or approximate location. Location can be inaccurate, delayed, or unavailable because of GPS, device, permission, battery, network, or provider conditions.',
        'Disabling location may prevent the Driver Partner from going online, receiving nearby work, accepting an order, or completing location-dependent trip actions.'
      ]
    },
    {
      heading: 'Delivery and performance data',
      body: [
        'We process offered, accepted, rejected, cancelled, active, and completed orders; pickup, stop, and drop locations; customer and recipient contact details needed for delivery; goods type and weight; routes; timestamps; and order-status history.',
        'We also process arrival, pickup, transit, and delivery events; waiting time; pickup and delivery OTP-verification status; pickup and delivery proof photographs; Partner cancellation history and daily cancellation count; ratings; and support or dispute evidence.',
        'Delivery timing and status data may be used to calculate earnings, waiting charges, on-time or delayed settlement, customer cancellation payouts, service quality, fraud indicators, and dispute outcomes.'
      ]
    },
    {
      heading: 'Device, diagnostics, communications, and support',
      body: [
        'We may process app version, device and operating-system information, network information, IP-derived approximate information, permission and notification status, security events, crash details, performance logs, and other diagnostics needed to operate, secure, and improve the service.',
        'Support records may include account, KYC, vehicle, order, payment, payout, safety, complaint, screenshot, photograph, email, and other information voluntarily provided during a support request.',
        'We may communicate through OTP, SMS, phone, email, push notification, or in-app message for order offers, trip updates, payments, payouts, verification, safety, support, account actions, and material legal changes.'
      ]
    },
    {
      heading: 'How we use Driver Partner data',
      body: [
        'We use data to create and secure Partner accounts; verify KYC, vehicle, bank, and eligibility information; determine whether a Partner can receive work; offer and assign nearby orders; manage pickup and delivery; provide navigation, tracking, safety, and notifications; calculate earnings and settlements; process top-ups and payouts; provide support; prevent fraud and unsafe conduct; resolve disputes; and comply with tax, accounting, payment, safety, and legal obligations.',
        'We do not sell Driver Partner personal or sensitive data and do not use it for third-party targeted advertising.'
      ]
    },
    {
      heading: 'Information disclosed to customers',
      body: [
        'For an offered or assigned delivery, the relevant customer may receive the Driver Partner name, phone number, rating, vehicle category, vehicle registration number, order status, estimated arrival information, and active-trip location needed to coordinate and track the delivery.',
        'A private tracking page may show limited Driver Partner and delivery information while tracking is active. Government identification documents, bank details, authentication secrets, payment credentials, and delivery OTPs are not displayed on that page.',
        'Driver Partners receive relevant customer, sender, recipient, address, goods, contact, payment-mode, and instruction information needed to consider or complete a delivery and must use it only for that purpose, safety, support, dispute resolution, or law.'
      ]
    },
    {
      heading: 'Service providers and other disclosures',
      body: [
        'We use providers for authentication, notifications, maps, location and routing, payment processing, media storage, cloud and database hosting, diagnostics, support, KYC review, and fraud prevention. These may include Firebase, Expo, Google Maps, Razorpay, Cloudinary, and our hosting and database providers.',
        'We may disclose relevant information to banks, payment providers, insurers, professional advisers, courts, regulators, law-enforcement bodies, or public authorities when reasonably necessary to comply with law, process payments, investigate fraud, protect safety, enforce agreements, or establish or defend legal claims.',
        'If Indiery undergoes a lawful merger, restructuring, financing, acquisition, or transfer of the service, relevant information may transfer subject to applicable notice, confidentiality, and data-protection requirements.'
      ]
    },
    {
      heading: 'Security',
      body: [
        'We use reasonable safeguards such as HTTPS encryption in transit, OTP and token authentication, role-based access controls, protected provider credentials, restricted upload flows, logging, monitoring, and access limitation based on business need.',
        'No system is completely secure. Driver Partners must protect their phones, OTPs, accounts, KYC documents, bank details, delivery OTPs, and customer information and promptly report suspected unauthorised use to support@indiery.com.',
        'Where applicable law requires notification of a personal-data breach, Indiery will provide or support the required notices and response steps.'
      ]
    },
    {
      heading: 'Retention and account deletion',
      body: [
        'Account and profile data may be kept while the Partner account is active. KYC, vehicle, location, delivery, proof, payment, wallet, payout, tax, accounting, fraud, safety, support, and audit records are retained only as long as reasonably necessary for their purpose or as required or permitted by law.',
        'Driver Partners may request deletion from Account settings, the public account-deletion page, or support@indiery.com. We may verify ownership and may delay completion while an active order, payout, investigation, dispute, or legal retention requirement remains.',
        'When a request is completed, eligible data is deleted or irreversibly de-identified. Records retained for payment reconciliation, tax, accounting, fraud prevention, safety, disputes, or legal obligations are restricted to those purposes and removed when the requirement ends. Deleting the app does not delete the account.'
      ]
    },
    {
      heading: 'Choices and privacy rights',
      body: [
        'Subject to applicable law and its commencement dates, Driver Partners may request access, correction, completion, updating, deletion or erasure, withdrawal of consent where applicable, grievance redressal, and other rights made available by law. We may verify identity before acting.',
        'Driver Partners may decline or later disable location, camera, selected-photo, or notification permissions in device settings. The related feature may become unavailable, but unrelated features remain accessible where practical.',
        'Withdrawal does not affect processing already completed lawfully and may prevent Indiery from providing a service that requires the withdrawn information.'
      ]
    },
    {
      heading: 'Children, international processing, changes, and contact',
      body: [
        'The Partner service is only for adults who are legally eligible to drive and contract for delivery work. Indiery does not knowingly register children as Driver Partners.',
        'Indiery primarily operates in India. Providers may process information in another country where they operate, subject to applicable Indian law, notified restrictions, and appropriate safeguards.',
        'We may update this policy when services, providers, security practices, or legal duties change. We will update the effective date and provide additional notice when a material change affects rights or data use where required.',
        'Privacy, account-deletion, and grievance contact: support@indiery.com. Website: https://www.indiery.com.'
      ]
    }
  ]
};

const termsPolicy: LegalPolicy = {
  title: 'Customer Terms and Conditions',
  updatedAt,
  summary:
    'The rules governing customer accounts, delivery bookings, payments, tracking, cancellations, and use of the Indiery Customer app and website.',
  sections: [
    {
      heading: 'Acceptance and eligibility',
      body: [
        'By creating a Customer account, booking a delivery, making a payment, or otherwise using the Indiery Customer app or website, you agree to these Customer Terms and Conditions, the Customer Privacy Policy, and the Refund and Cancellation Rules.',
        'You must be at least 18 and legally able to enter a contract, or use the service through a parent or legal guardian. You must provide accurate information and comply with applicable law.',
        'If you do not agree, do not create a Customer account, make a booking, or use the service.'
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
        'Customers must keep account access, phones, OTPs, and devices secure and must promptly report suspected unauthorized use.',
        'A Customer may not impersonate another person, create fraudulent accounts, manipulate location or payments, or use the platform to harm another person.',
        'Customers agree to receive service communications needed for authentication, bookings, payments, safety, support, policy updates, and delivery status. Notification permissions can be changed in device settings.'
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
      heading: 'Driver Partner service and customer cooperation',
      body: [
        'Indiery seeks to connect a Customer with an eligible Driver Partner, but a particular Partner, pickup time, route, or delivery time is not guaranteed.',
        'Customers must treat Driver Partners respectfully, provide safe and lawful pickup and delivery access, and must not demand unsafe driving, unlawful handling, or services outside the confirmed booking.',
        'A Driver Partner may refuse goods that differ materially from the booking, are unsafe, are inadequately packed, exceed the selected vehicle capacity, or appear unlawful. Customers should report service or safety concerns to Indiery support.'
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
      heading: 'Fares, payments, Wallet, and Indiery Coins',
      body: [
        'The app shows the applicable fare or estimate before confirmation. The final amount may change only where the app discloses an adjustment permitted by these Terms, such as waiting, return, toll, tax, correction, or cancellation charges.',
        'Online payments are processed by a disclosed payment provider. Users authorize Indiery and its provider to create, verify, refund, or reconcile transactions associated with a booking.',
        'Wallet credits and promotional coins are platform balances, are not bank deposits, may be subject to stated eligibility or expiry rules, and are not transferable or redeemable for cash unless applicable law requires otherwise.',
        'For COD, the Customer must pay the final cash amount shown for the order to the assigned Driver Partner. The Customer must not make an unauthorized payment or disclose a UPI PIN, card PIN, CVV, password, or OTP.'
      ]
    },
    {
      heading: 'Cancellation, refunds, and disputes',
      body: [
        'The Refund and Cancellation Rules shown in the app form part of these Terms. Any charge should be disclosed before the user confirms it where reasonably possible.',
        'Users should report payment, damage, loss, missing-delivery, or incorrect-delivery disputes promptly and provide requested evidence. Indiery may review booking records, OTP verification, proof images, location history, communications, and payment references.',
        'Nothing in these Terms removes a consumer right or remedy that cannot lawfully be excluded.'
      ]
    },
    {
      heading: 'Location, tracking, and proof',
      body: [
        'Location and route information is approximate and may be delayed or unavailable. It must not be used as an emergency or safety-guarantee service.',
        'A customer may share a private tracking link. Anyone receiving that link may see limited order and live partner-location information while tracking is active, so users must share it carefully.',
        'OTP records, timestamps, status events, and pickup or delivery photos may be used as operational evidence, but Indiery may consider other reliable evidence when resolving a dispute.'
      ]
    },
    {
      heading: 'Suspension and termination',
      body: [
        'Indiery may restrict or suspend a Customer account to protect users, investigate fraud or unsafe behavior, comply with law, address repeated abusive cancellations or payment failures, or enforce these Terms.',
        'Customers may stop using the service at any time and may request account deletion. Payment, dispute, safety, and legal obligations continue as permitted by law.'
      ]
    },
    {
      heading: 'Disclaimers and liability',
      body: [
        'To the maximum extent permitted by law, the platform is provided on an "as available" basis without a guarantee of uninterrupted access, a particular partner, route, pickup time, delivery time, or outcome.',
        'Indiery is not responsible for loss caused by prohibited or incorrectly declared goods, inadequate packaging, inaccurate addresses or contacts, unauthorized OTP disclosure, user negligence, or events outside reasonable control.',
        'Any exclusion or limitation applies only to the extent permitted by applicable law and does not limit liability that cannot lawfully be limited.'
      ]
    },
    {
      heading: 'Privacy, changes, and governing law',
      body: [
        'The Customer Privacy Policy explains how Indiery handles Customer personal and sensitive data. Driver Partner information is governed by the separate Driver Partner Privacy Policy.',
        'We may update these Terms for legal, security, or service changes. The updated date will be shown, and material changes will receive additional notice where required.',
        'These Terms are governed by the laws of India. Courts or tribunals having lawful jurisdiction in India may hear disputes, subject to any mandatory consumer forum or other remedy available under applicable law.',
        'Before starting formal proceedings, users are encouraged to contact support@indiery.com so we can try to resolve the issue.'
      ]
    }
  ]
};

const partnerTermsPolicy: LegalPolicy = {
  title: 'Driver Partner Terms and Conditions',
  updatedAt,
  summary:
    'The rules governing Driver Partner registration, KYC, availability, deliveries, safety, earnings, wallet settlement, cancellations, and payouts on Indiery.',
  sections: [
    {
      heading: 'Introduction, acceptance, and definitions',
      body: [
        'Indiery operates the Indiery Partner app and related delivery platform. Driver, Driver Partner, and Partner mean the same independent delivery-partner role in these Terms.',
        'By registering, completing KYC, going online, accepting a booking, or using the Partner app, you agree to these Driver Partner Terms and Conditions, the Driver Partner Privacy Policy, and other policies expressly shown or incorporated in the app.',
        'A Booking is a customer delivery request offered or assigned through Indiery. A Customer is the person or business requesting it. The Platform includes the Partner app, Customer app, website, backend, payment, tracking, and support services.',
        'If you do not agree, do not register, go online, accept a Booking, or use the Partner service.'
      ]
    },
    {
      heading: 'Eligibility, registration, and KYC',
      body: [
        'A Driver Partner must be at least 18, legally able to contract and work, hold the licence required for the selected vehicle, and satisfy applicable registration, insurance, permit, tax, and legal requirements.',
        'You must provide accurate, complete, and current profile, contact, identity, vehicle, KYC, and payout information. Verification may require a selfie and PAN, Aadhaar, driving-licence, RC, insurance, and bank-proof images or details.',
        'Indiery may approve, reject, request more information for, or re-verify an application based on eligibility, safety, fraud, capacity, or legal requirements. Expired, false, altered, or misleading documents may cause restriction, suspension, or termination.'
      ]
    },
    {
      heading: 'Vehicle and account requirements',
      body: [
        'Only the approved vehicle and vehicle category registered to the account may be used unless Indiery authorizes a change. The vehicle must remain roadworthy, legally registered, insured, permitted where required, and suitable for accepted goods.',
        'The account is personal. You must not share, sell, rent, transfer, or allow another person to use it. You are responsible for protecting the registered phone, OTPs, access tokens, device, and login information and must report suspected unauthorized use promptly.',
        'You must promptly update changed contact, vehicle, licence, insurance, permit, KYC, and payout information.'
      ]
    },
    {
      heading: 'Independent service-provider relationship',
      body: [
        'Unless applicable law or a separate written agreement requires otherwise, Driver Partners provide delivery services as independent service providers and are not Indiery employees, agents, joint-venture partners, or representatives.',
        'You decide when to go online and whether to accept an offered Booking, subject to accepted-Booking duties, platform eligibility rules, lawful operational controls, and these Terms. You have no authority to make promises, contracts, refunds, or representations on behalf of Indiery.',
        'You are responsible for your vehicle, work methods, expenses, licences, permits, insurance, taxes, and statutory obligations to the extent required by law.'
      ]
    },
    {
      heading: 'Availability, offers, and accepted Bookings',
      body: [
        'Going online makes you eligible for nearby offers but does not guarantee any minimum number, value, distance, or type of Booking, earnings, incentive, route, or working time.',
        'Before accepting, review the available pickup, drop, vehicle, goods, payment-mode, distance, and estimated-earnings information. Accept only a Booking you reasonably intend and are equipped to complete.',
        'After acceptance, proceed to pickup within a reasonable time, use a lawful and reasonably efficient route, keep the Booking status accurate, and promptly report any material delay, access problem, accident, unsafe condition, or inability to complete.'
      ]
    },
    {
      heading: 'Pickup, delivery, OTP, and proof',
      body: [
        'At pickup, verify the Booking and goods without opening or using parcel contents. Use the required app status and pickup-verification steps, and collect genuine proof only through authorized flows.',
        'At delivery, hand goods to the intended recipient or follow an authorized support instruction, complete the required OTP or proof flow, and mark delivery only after the handover actually occurs.',
        'You must not fabricate timestamps, location, photos, OTP results, delivery status, or proof. OTPs and proof media are confidential and may be reviewed for settlement, safety, fraud prevention, complaints, or disputes.'
      ]
    },
    {
      heading: 'Parcel handling and prohibited goods',
      body: [
        'Handle goods with reasonable care, keep them appropriately secured, and follow lawful handling instructions. Do not open, tamper with, use, substitute, abandon, intentionally delay, damage, or unlawfully retain a parcel.',
        'Do not knowingly carry illegal goods, weapons, explosives, flammable or hazardous materials, controlled substances, stolen property, human remains, live animals, cash or negotiable instruments, or another item prohibited by law or platform notice.',
        'You may refuse and should report goods that materially differ from the Booking, exceed vehicle capacity, appear unsafe or unlawful, or are inadequately packed. Follow lawful support or authority instructions for refusal, return, storage, or handover.'
      ]
    },
    {
      heading: 'Customer interaction and confidentiality',
      body: [
        'Treat Customers, recipients, the public, and Indiery personnel professionally and respectfully. Harassment, threats, discrimination, abuse, retaliation, or inappropriate conduct are prohibited.',
        'Do not demand an unauthorized fare, tip, surcharge, or payment. Collect cash only when the Booking is marked COD and only up to the final authorized cash amount shown by the Platform.',
        'Use Customer, sender, recipient, address, phone, tracking, order, and goods information only to consider or complete the Booking, support safety, resolve a dispute, or comply with law. Do not retain, disclose, contact, or use it for an unrelated purpose.'
      ]
    },
    {
      heading: 'Safety obligations and incidents',
      body: [
        'Drive lawfully and safely; obey traffic rules; do not drive while impaired, dangerously fatigued, distracted, or using a handheld phone unlawfully; and use required safety equipment.',
        'Do not follow an app instruction when doing so would be unsafe or illegal. Stop safely before operating the app where required.',
        'Immediately report an accident, injury, theft, loss, damage, police action, serious complaint, or other safety incident connected with a Booking and cooperate with reasonable investigation and evidence requests.'
      ]
    },
    {
      heading: 'Earnings, commission, waiting, and delay settlement',
      body: [
        'The current completed-order calculation applies to the commissionable order amount, including applicable waiting charges and before a Customer Coin discount. The base earning component is 80%, the platform commission is 15%, and 5% is held as an on-time reserve.',
        'For an on-time completed order, the 5% reserve is released to the Driver Partner, producing an 85% Partner entitlement. For an order delivered after the system ETA deadline, the reserve is not released to the Partner and a delay deduction equal to 5% of the 80% base earning component applies, producing a 76% Partner entitlement under the current calculation.',
        'Bike waiting is free for the first 5 minutes after arrival at pickup and then charged at INR 2 per started minute. For the other three supported cargo vehicles, waiting is free for the first 30 minutes and then charged at INR 5 per started minute. Waiting charges use the same completed-order commission calculation.',
        'The estimate, final order record, and Wallet ledger control the amount actually settled. Indiery may correct a proven calculation, duplicate entry, payment reversal, fraud, dispute, tax withholding, or technical error with an explanation or ledger entry where reasonably possible.'
      ]
    },
    {
      heading: 'COD, Partner Wallet, top-ups, and payouts',
      body: [
        'For prepaid, Wallet, or Coin-funded amounts, the Driver Partner entitlement is credited to the Partner Wallet when settlement is completed. For COD, the Driver Partner collects the authorized customer cash and the Wallet is adjusted by Partner entitlement minus cash collected.',
        'Because a COD Driver Partner may collect more cash than the Partner entitlement, the Wallet adjustment may be a debit and the Wallet may become negative. A Driver Partner must maintain at least INR 200 in the Partner Wallet to receive new offers and must top up to at least that amount when the balance is lower.',
        'Wallet top-ups and payouts use the payment or bank method supported in the app. Payout availability, processing time, verification, minimums, deductions, bank delays, taxes, holds, and corrections are subject to the displayed workflow and applicable law.',
        'You must keep payout details accurate and must never provide a UPI PIN, card PIN, CVV, password, OTP, or similar secret to Indiery support.'
      ]
    },
    {
      heading: 'Customer cancellations and Partner payout',
      body: [
        'A Customer cancellation is free before pickup and through the first 5 minutes after pickup, so no cancellation payout is due to the Driver Partner for those free cancellations.',
        'More than 5 minutes after pickup and before delivery, the Customer is charged 10% of the current order total. Under the current calculation, 85% of that cancellation charge is credited to the assigned Driver Partner and 15% is retained as platform commission.',
        'Cancellation after delivery is unavailable. Any return, re-delivery, safe storage, disposal, or authority handover must follow an authorized support instruction and may be handled separately.'
      ]
    },
    {
      heading: 'Driver Partner cancellations',
      body: [
        'A Driver Partner may voluntarily cancel no more than two accepted Bookings per India calendar day under the current platform rule. The app may block an additional voluntary cancellation after the limit is reached.',
        'Use cancellation only when reasonably necessary, select or provide an accurate reason, and contact support for an accident, breakdown, safety risk, unlawful goods, or another serious issue. Indiery may review the circumstances and reassign or cancel a Booking where appropriate.',
        'Repeated, false, avoidable, abusive, or unsafe cancellations may affect offers, incentives, access, or account status, subject to reasonable review and applicable law.'
      ]
    },
    {
      heading: 'Ratings, performance, incentives, and expenses',
      body: [
        'Indiery may use acceptance, rejection, completion, cancellation, timing, status, location, proof, rating, complaint, safety, and policy-compliance information to operate the service, investigate issues, and determine eligibility for offers or incentives.',
        'An incentive or bonus is optional and governed by the offer shown in the app. It is not guaranteed earnings and may be changed or withdrawn prospectively, or denied or reversed where its disclosed conditions were not met or fraud occurred.',
        'Unless Indiery expressly agrees otherwise in writing, you bear fuel or charging, maintenance, repairs, insurance, licences, permits, tax, phone, data, parking, toll, fine, and other delivery expenses.'
      ]
    },
    {
      heading: 'Prohibited conduct and fraud',
      body: [
        'You must not manipulate location, offers, routes, status, waiting time, delivery timing, proof, ratings, incentives, Wallet entries, payments, payouts, or customer accounts; create fake Bookings; submit false documents; or make a false delivery confirmation.',
        'You must not misuse Customer data, collect unauthorized money, use another person or unapproved vehicle, interfere with the Platform, scrape or reverse engineer it, introduce malicious code, evade a restriction, or use Indiery for unlawful activity.',
        'Indiery may investigate suspected fraud, hold a disputed payout where permitted, reverse an improper credit, recover a proven amount owed, restrict or terminate access, preserve evidence, and report conduct to a provider or authority as permitted or required by law.'
      ]
    },
    {
      heading: 'Suspension and termination',
      body: [
        'Indiery may restrict, suspend, or terminate a Partner account to protect safety or users, investigate fraud, enforce these Terms, address invalid or expired documents, respond to repeated serious complaints or cancellations, comply with law, or protect the Platform.',
        'Where reasonably possible and lawful, Indiery will provide notice or a support path. Immediate restriction may be used for an urgent safety, fraud, security, legal, or account-integrity risk.',
        'You may stop using the Platform and request account deletion, but outstanding deliveries, cash, Wallet debits, payouts, disputes, confidentiality duties, tax records, and other accrued obligations survive as permitted by law.'
      ]
    },
    {
      heading: 'Platform licence, third-party services, and availability',
      body: [
        'Indiery grants a limited, personal, revocable, non-exclusive, non-transferable licence to use the Partner app only for authorized delivery work. Indiery and its licensors retain rights in the app, brand, software, designs, content, and systems.',
        'The Platform may depend on services such as Google Maps, Firebase, Expo, Razorpay, Cloudinary, hosting, database, bank, telecommunications, and notification providers. Their availability and processing may also be subject to their applicable terms and notices.',
        'The Platform is provided on an as-available basis. Maps, ETA, location, offer, network, notification, payment, and payout information can be inaccurate, delayed, interrupted, or unavailable and must not replace safe driving or independent judgment.'
      ]
    },
    {
      heading: 'Responsibility, indemnity, and limits',
      body: [
        'A Driver Partner is responsible for loss, damage, delay, injury, fine, claim, or cost caused by that Partner\'s own negligence, fraud, intentional misconduct, unlawful act, unsafe driving, unauthorized payment, data misuse, or material breach of these Terms.',
        'To the extent permitted by law, the Driver Partner will indemnify Indiery and its personnel against third-party claims and reasonable costs arising directly from those acts or omissions. This does not apply to the extent a claim was caused by Indiery negligence, unlawful conduct, or responsibility that cannot legally be excluded.',
        'To the maximum extent permitted by law, Indiery is not liable for indirect or consequential loss caused by service interruption, third-party delay, inaccurate user information, prohibited goods, or events outside reasonable control. Nothing excludes a liability or legal remedy that cannot lawfully be excluded.'
      ]
    },
    {
      heading: 'Force majeure',
      body: [
        'Neither party is responsible for delay or failure caused by an event outside reasonable control, including severe weather, flood, fire, epidemic, war, civil unrest, government action, legal restriction, road closure, strike, power or telecommunications outage, or major provider failure.',
        'Indiery may suspend, reroute, delay, reassign, or cancel affected services to protect people, goods, and the Platform, subject to payment and other rights that applicable law requires.'
      ]
    },
    {
      heading: 'Governing law and disputes',
      body: [
        'These Terms are governed by the laws of India. The parties should first try to resolve a dispute through good-faith support discussions using the order, Wallet, payout, proof, or account records relevant to the issue.',
        'Subject to any mandatory forum, employment classification rule, statutory remedy, or other jurisdiction that applicable law requires, courts in Lucknow, Uttar Pradesh, India will have jurisdiction.'
      ]
    },
    {
      heading: 'Changes, severability, entire agreement, and contact',
      body: [
        'Indiery may update these Terms for service, pricing, safety, security, provider, operational, or legal changes. The effective date will be updated and material changes will receive additional notice where required. Continued use after the effective date constitutes acceptance only to the extent permitted by law.',
        'If a provision is invalid or unenforceable, it will be limited to the minimum necessary and the remaining provisions continue. These Terms and the policies expressly incorporated in them form the agreement for Driver Partner use of the Platform, subject to any separate written agreement.',
        'Driver Partner support, legal notice, and grievance contact: support@indiery.com. Website: https://www.indiery.com.'
      ]
    }
  ]
};

const refundsPolicy: LegalPolicy = {
  title: 'Indiery Refund and Cancellation Rules',
  updatedAt,
  summary:
    'How cancellations, refunds, coins, waiting charges, and delivery disputes are handled.',
  sections: [
    {
      heading: 'Before partner acceptance',
      body: [
        'A customer may cancel any time before pickup without a cancellation charge. Any captured prepaid amount and eligible coins are returned through the supported refund method.',
        'A payment authorization that was not captured may disappear according to the bank or payment provider processing time.'
      ]
    },
    {
      heading: 'After acceptance or arrival',
      body: [
        'Customer cancellation is free before pickup and during the first 5 minutes after pickup.',
        'If the partner cancels, is unavailable, or materially fails to perform, Indiery may reassign or cancel the order without a customer cancellation charge.',
        'Incorrect addresses, unavailable contacts, unsafe goods, failed access, excessive waiting, or a requested return trip may result in additional charges shown or explained before they are applied where reasonably possible.'
      ]
    },
    {
      heading: 'After pickup',
      body: [
        'More than 5 minutes after pickup and before delivery, a customer cancellation charge equal to 10% of the order total applies. Cancellation is unavailable after delivery.',
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
      heading: 'Claims and support',
      body: [
        'Customers should report missing, damaged, or incorrect delivery issues within 48 hours where practical. A delay does not remove a mandatory legal right.',
        'Indiery may review booking details, goods declarations, OTPs, photos, timestamps, location history, support records, and payment references before deciding an adjustment.',
        'For a cancellation, refund, duplicate payment, or delivery dispute, contact support@indiery.com with the order number and relevant payment reference. Never send a UPI PIN, CVV, password, or full card number.'
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
  <meta name="robots" content="index,follow" />
  <title>${escapeHtml(title)}</title>
  <style>
    body{font-family:Arial,sans-serif;margin:0;background:#f8fafc;color:#111827;line-height:1.55}
    main{max-width:900px;margin:0 auto;padding:32px 18px 48px}
    nav{display:flex;flex-wrap:wrap;gap:14px;margin-bottom:28px}
    h1{font-size:30px;margin:0 0 8px}
    h2{font-size:19px;margin-top:0}
    p,li,label{font-size:15px}
    .card{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:20px;margin-top:18px}
    .muted{color:#6b7280}
    input,select,textarea{width:100%;box-sizing:border-box;border:1px solid #d1d5db;border-radius:10px;padding:12px;margin:6px 0 14px;font-size:15px}
    button{background:#7c3aed;color:#fff;border:0;border-radius:10px;padding:12px 16px;font-weight:700;cursor:pointer}
    a{color:#6d28d9}
  </style>
</head>
<body><main>
  <nav aria-label="Legal pages">
    <a href="/privacy">Customer Privacy</a>
    <a href="/partner-privacy">Driver Partner Privacy</a>
    <a href="/terms">Customer Terms</a>
    <a href="/partner-terms">Driver Partner Terms</a>
    <a href="/refunds">Refund rules</a>
    <a href="/account-deletion">Account deletion</a>
  </nav>
  ${body}
</main></body>
</html>`;
}

function renderPolicy(policy: LegalPolicy) {
  const sections = policy.sections
    .map(
      (section) =>
        `<section class="card"><h2>${escapeHtml(section.heading)}</h2>${section.body
          .map((line) => `<p>${escapeHtml(line)}</p>`)
          .join('')}</section>`
    )
    .join('');

  return page(
    policy.title,
    `<h1>${escapeHtml(policy.title)}</h1>
    <p class="muted">Last updated: ${escapeHtml(policy.updatedAt)}</p>
    <p>${escapeHtml(policy.summary)}</p>
    ${sections}`
  );
}

legalRouter.get('/privacy', (_req, res) => {
  res.type('html').send(renderPolicy(privacyPolicy));
});

legalRouter.get('/partner-privacy', (_req, res) => {
  res.type('html').send(renderPolicy(partnerPrivacyPolicy));
});

legalRouter.get('/terms', (_req, res) => {
  res.type('html').send(renderPolicy(termsPolicy));
});

legalRouter.get('/partner-terms', (_req, res) => {
  res.type('html').send(renderPolicy(partnerTermsPolicy));
});

legalRouter.get('/refunds', (_req, res) => {
  res.type('html').send(renderPolicy(refundsPolicy));
});

legalRouter.get('/account-deletion', (_req, res) => {
  res.type('html').send(
    page(
      'Indiery Account Deletion',
      `<h1>Delete your Indiery account</h1>
      <p class="muted">Customers and delivery partners can request deletion of their account and associated personal information.</p>
      <section class="card">
        <h2>Submit a request</h2>
        <p>You can request deletion inside either app from Account &gt; Delete account. If you cannot sign in, use this form. We may contact you to verify account ownership.</p>
        <form method="post" action="/api/legal/account-deletion-requests">
          <label for="role">Account type</label>
          <select id="role" name="role"><option value="customer">Customer</option><option value="partner">Driver Partner</option></select>
          <label for="name">Full name</label>
          <input id="name" name="name" autocomplete="name" maxlength="120" />
          <label for="phone">Mobile number used in the app</label>
          <input id="phone" name="phone" required autocomplete="tel" minlength="8" maxlength="20" />
          <label for="email">Email address</label>
          <input id="email" name="email" type="email" autocomplete="email" />
          <label for="reason">Reason or note</label>
          <textarea id="reason" name="reason" rows="4" maxlength="800"></textarea>
          <button type="submit">Submit deletion request</button>
        </form>
      </section>
      <section class="card">
        <h2>What is deleted</h2>
        <p>After ownership verification, we process eligible requests without unreasonable delay. We delete or irreversibly de-identify account, profile, contact, device-token, and other personal data that is no longer required to operate the service or meet a legal obligation.</p>
        <p>Partner KYC and bank details, uploaded media, and operational location data are deleted or de-identified when they are no longer required for verification, payment, safety, dispute, fraud-prevention, or legal purposes.</p>
      </section>
      <section class="card">
        <h2>What may be retained</h2>
        <p>Limited order, payment, refund, wallet, payout, tax, accounting, safety, fraud-prevention, audit, and dispute records may be retained for the period required by law or a documented operational need. Access is restricted to that purpose, and the data is deleted or de-identified when the need ends.</p>
        <p>Deleting the app from your phone does not delete your account. A submitted request is not completed until ownership is verified and the eligible deletion process finishes.</p>
        <p>For help, email <a href="mailto:support@indiery.com">support@indiery.com</a>. Never send an OTP, PIN, password, CVV, or full card number.</p>
      </section>`
    )
  );
});

legalRouter.post(
  '/api/legal/account-deletion-requests',
  asyncRoute(async (req, res) => {
    const body = DeletionRequestSchema.parse(req.body);

    await submitAccountDeletionRequest({
      role: body.role,
      name: body.name,
      phone: body.phone,
      email: body.email || undefined,
      reason: body.reason,
      source: 'web'
    });

    if (req.headers.accept?.includes('text/html')) {
      return res.status(201).type('html').send(
        page(
          'Deletion request submitted',
          `<h1>Deletion request submitted</h1>
          <section class="card"><p>We received your Indiery account deletion request.</p>
          <p class="muted">We may contact you to verify ownership before eligible data is deleted or de-identified. This confirmation does not reveal whether an account exists for the submitted details.</p>
          <p><a href="/privacy">Read the Privacy Policy</a></p></section>`
        )
      );
    }

    return res.status(201).json({ ok: true, status: 'requested' });
  })
);
