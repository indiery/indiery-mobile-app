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

export type PaymentMode = 'upi' | 'card' | 'netbanking' | 'cash' | 'wallet';
export type PaymentProvider = 'razorpay' | 'cash' | 'wallet';
export type WalletLedgerBucket = 'cash' | 'coins';
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
    walletBalance: number;
    savedAddresses: SavedAddress[];
    usedCoupons?: string[];
  };
  partnerProfile?: {
    vehicleId?: string;
    vehicleNumber?: string;
    rating: number;
    online: boolean;
    walletBalance: number;
    weeklyOrders: number;
    kycStatus: 'not_started' | 'pending' | 'verified' | 'rejected';
    docs: Record<'selfie' | 'pan' | 'aadhaar' | 'drivingLicence' | 'rc' | 'insurance' | 'bank', boolean>;
    docUrls?: Partial<Record<'selfie' | 'pan' | 'aadhaar' | 'drivingLicence' | 'rc' | 'insurance' | 'bank', string>>;
    bankDetails?: {
      accountHolder?: string;
      accountNumberMasked?: string;
      ifsc?: string;
    };
    currentLocation?: PartnerLocation;
  };
}

export interface SavedAddress {
  id: string;
  label: string;
  address: string;
  addressLine?: string;
  lat?: number;
  lng?: number;
  type?: 'home' | 'work' | 'other';
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

export interface LocationSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText?: string;
}

export interface LocationDetails {
  placeId: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
}

export interface FareBreakup {
  distanceKm: number;
  billableKm: number;
  orderValue: number;
  base: number;
  distance: number;
  waitingCharge?: number;
  waitingMinutes?: number;
  billableWaitingMinutes?: number;
  waitingFreeMinutes?: number;
  waitingPerMinute?: number;
  coins: number;
  total: number;
  driverCommission: number;
  reserveAmount: number;
  partnerNet: number;
  platformCommission: number;
  lateDriverPenalty: number;
  latePlatformPenalty: number;
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

export interface RoutePathCoordinate {
  latitude: number;
  longitude: number;
}

export interface PartnerRoutePath {
  coordinates: RoutePathCoordinate[];
  source: 'google_directions' | 'fallback';
}

export interface TripOtp {
  pickup?: string;
  drop?: string;
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
  extraStops: LocationPoint[];
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
  tripOtp?: TripOtp;
  partnerLocation?: PartnerLocation;
  settlement?: {
    delayed: boolean;
    partnerCredit: number;
    driverPenalty: number;
    platformPenalty: number;
    reserveReleasedTo: 'partner' | 'platform' | 'customer';
    settledAt?: string;
  };
  customerCancellation?: {
    policy:
      | 'free_before_pickup'
      | 'free_within_five_minutes_after_pickup'
      | 'ten_percent_after_five_minutes';
    charge: number;
    refundAmount: number;
    partnerCredit: number;
    platformCommission: number;
    coinDebit: number;
    pickedUpElapsedMinutes?: number;
    cancelledAt: string;
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

export interface CloudinarySignature {
  configured: true;
  provider: 'cloudinary';
  cloudName: string;
  apiKey: string;
  uploadUrl: string;
  folder: string;
  tags: string;
  timestamp: number;
  signature: string;
}

export interface CloudinaryUploadResult {
  secureUrl: string;
  publicId: string;
  provider: 'cloudinary';
}

export interface LedgerItem {
  id: string;
  amount: number;
  kind: 'credit' | 'debit';
  title: string;
  reference?: string;
  bucket?: WalletLedgerBucket;
  settled?: boolean;
  createdAt: string;
}

export interface CustomerWallet {
  balance: number;
  coins: number;
  ledger: LedgerItem[];
  coinLedger: LedgerItem[];
}

export interface PartnerStats {
  availableCount: number;
  activeCount: number;
  completedCount: number;
  todayEarn: number;
  cancellationsToday: number;
  cancellationsRemaining: number;
  ledger: LedgerItem[];
}

export interface CustomerBootstrap {
  user: UserProfile;
  wallet: CustomerWallet;
  vehicles: Vehicle[];
  activeOrder?: Order;
  activeOrders: Order[];
  orders: Order[];
}

export interface PartnerBootstrap {
  user: UserProfile;
  vehicles: Vehicle[];
  stats: PartnerStats;
  availableOrders: Order[];
  activeOrders: Order[];
  completedOrders: Order[];
}

export interface CreateOrderInput {
  quoteId?: string;
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
  extraStops?: LocationPoint[];
  pickupLat?: number;
  pickupLng?: number;
  dropLat?: number;
  dropLng?: number;
}
