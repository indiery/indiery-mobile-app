export type Role = 'customer' | 'partner';

export type OrderStatus =
  | 'searching'
  | 'offered'
  | 'accepted'
  | 'arrived_pickup'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'cancelled';

export type PaymentMode = 'upi' | 'card' | 'wallet' | 'netbanking' | 'cash';
export type PaymentProvider = 'demo' | 'razorpay' | 'cash';
export type UploadPurpose = 'pod' | 'kyc' | 'profile';

export interface PartnerLocation {
  lat?: number;
  lng?: number;
  heading?: number;
  speed?: number;
  updatedAt?: string;
}

export interface UserProfile {
  id: string;
  role: Role | 'admin';
  name: string;
  initials: string;
  phone: string;
  email?: string;
  city: string;
  customerProfile?: {
    coins: number;
    savedAddresses: string[];
  };
  partnerProfile?: {
    vehicleId?: string;
    vehicleNumber?: string;
    rating: number;
    online: boolean;
    walletBalance: number;
    weeklyOrders: number;
    kycStatus: 'not_started' | 'pending' | 'verified' | 'rejected';
    docs: Record<'selfie' | 'pan' | 'drivingLicence' | 'rc' | 'insurance' | 'bank', boolean>;
    docUrls?: Partial<Record<'selfie' | 'pan' | 'drivingLicence' | 'rc' | 'insurance' | 'bank', string>>;
    currentLocation?: PartnerLocation;
  };
}

export interface Vehicle {
  id: string;
  code: string;
  name: string;
  shortName: string;
  icon: string;
  serviceType: 'intracity' | 'intercity';
  capacityKg: number;
  baseFare: number;
  perKm: number;
  partnerShare: number;
  etaMinutes: number;
}

export interface LocationPoint {
  label: string;
  address: string;
  lat?: number;
  lng?: number;
  contactName?: string;
  contactPhone?: string;
}

export interface FareBreakup {
  distanceKm: number;
  billableKm: number;
  orderValue: number;
  base: number;
  distance: number;
  gst: number;
  coins: number;
  total: number;
  driverCommission: number;
  reserveAmount: number;
  partnerNet: number;
  platformCommission: number;
  lateDriverPenalty: number;
  latePlatformPenalty: number;
  lateRefundCoins: number;
  onTimePartnerPayout: number;
  latePartnerPayout: number;
  etaMinutes: number;
}

export interface OrderTimelineItem {
  key: string;
  title: string;
  note?: string;
  state: 'done' | 'active' | 'pending';
  at?: string;
}

export interface Order {
  id: string;
  orderNo: string;
  customerId: string;
  partnerId?: string;
  customer?: UserProfile;
  partner?: UserProfile;
  vehicle: Vehicle;
  pickup: LocationPoint;
  drop: LocationPoint;
  goodsType: string;
  weightKg: number;
  distanceKm: number;
  fare: FareBreakup;
  paymentMode: PaymentMode;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentProvider: PaymentProvider;
  paymentReference?: string;
  status: OrderStatus;
  etaMinutes: number;
  timeline: OrderTimelineItem[];
  pod: {
    pickupPhotoUrl?: string;
    dropPhotoUrl?: string;
    pickupOtpVerified?: boolean;
    dropOtpVerified?: boolean;
  };
  partnerLocation?: PartnerLocation;
  settlement?: {
    delayed: boolean;
    partnerCredit: number;
    customerRefundCoins: number;
    driverPenalty: number;
    platformPenalty: number;
    reserveReleasedTo: 'partner' | 'customer';
    settledAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PaymentIntent {
  provider: PaymentProvider;
  reference: string;
  status: 'pending' | 'paid';
  amount: number;
  currency: 'INR';
  checkout?: {
    keyId: string;
    orderId: string;
  };
}

export type CloudinarySignature =
  | {
      configured: false;
      provider: 'demo';
      folder: string;
      tags: string;
      timestamp: number;
    }
  | {
      configured: true;
      provider: 'cloudinary';
      cloudName: string;
      apiKey: string;
      uploadUrl: string;
      folder: string;
      tags: string;
      timestamp: number;
      signature: string;
    };

export interface CloudinaryUploadResult {
  secureUrl: string;
  publicId: string;
  provider: 'demo' | 'cloudinary';
}

export interface LedgerItem {
  id: string;
  amount: number;
  kind: 'credit' | 'debit';
  title: string;
  reference?: string;
  createdAt: string;
}

export interface PartnerStats {
  availableCount: number;
  activeCount: number;
  completedCount: number;
  todayEarn: number;
  ledger: LedgerItem[];
}

export interface CustomerBootstrap {
  user: UserProfile;
  vehicles: Vehicle[];
  activeOrder?: Order;
  orders: Order[];
}

export interface PartnerBootstrap {
  user: UserProfile;
  stats: PartnerStats;
  availableOrders: Order[];
  activeOrders: Order[];
  completedOrders: Order[];
}

export interface CreateOrderInput {
  pickup: string;
  drop: string;
  vehicleId: string;
  goodsType: string;
  weightKg: number;
  coins: number;
  paymentMode: PaymentMode;
  pickupContactName?: string;
  pickupContactPhone?: string;
  dropContactName?: string;
  dropContactPhone?: string;
  pickupLat?: number;
  pickupLng?: number;
  dropLat?: number;
  dropLng?: number;
}
