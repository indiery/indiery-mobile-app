import type {
  CloudinarySignature,
  CloudinaryUploadResult,
  CreateOrderInput,
  CustomerBootstrap,
  FareBreakup,
  LocationDetails,
  LocationSuggestion,
  Order,
  PaymentIntent,
  PartnerBootstrap,
  PartnerLocation,
  Role,
  UploadPurpose,
  UserProfile,
  Vehicle
} from './types';

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, message: string, payload: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

export class IndieryApi {
  private baseUrl: string;
  private token?: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  setToken(token: string) {
    this.token = token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined)
    };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = typeof payload?.message === 'string' ? payload.message : 'Request failed';
      throw new ApiError(response.status, message, payload);
    }
    return payload as T;
  }

  firebaseLogin(role: Role, firebaseIdToken: string) {
    return this.request<{ token: string; user: UserProfile }>('/auth/firebase-login', {
      method: 'POST',
      body: JSON.stringify({ role, firebaseIdToken })
    });
  }

  requestAccountDeletion(reason?: string) {
    return this.request<{ ok: boolean; status: string }>('/auth/account-deletion-request', {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }

  vehicles() {
    return this.request<{ vehicles: Vehicle[] }>('/meta/vehicles');
  }

  autocompleteLocations(input: string, sessionToken?: string) {
    const params = new URLSearchParams({ input });
    if (sessionToken) params.set('sessionToken', sessionToken);
    return this.request<{ suggestions: LocationSuggestion[] }>(`/maps/autocomplete?${params.toString()}`);
  }

  locationDetails(placeId: string, sessionToken?: string) {
    const params = new URLSearchParams({ placeId });
    if (sessionToken) params.set('sessionToken', sessionToken);
    return this.request<{ location: LocationDetails }>(`/maps/place-details?${params.toString()}`);
  }

  customerBootstrap() {
    return this.request<CustomerBootstrap>('/customer/bootstrap');
  }

  updateCustomerProfile(input: { name: string; email?: string; city: string }) {
    return this.request<{ user: UserProfile }>('/customer/profile', {
      method: 'PATCH',
      body: JSON.stringify(input)
    });
  }

  estimate(input: {
    pickup: string;
    drop: string;
    vehicleId: string;
    coins?: number;
    weightKg?: number;
    pickupLat?: number;
    pickupLng?: number;
    dropLat?: number;
    dropLng?: number;
  }) {
    return this.request<{ fare: FareBreakup; vehicle: Vehicle }>('/customer/estimate', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  }

  createOrder(input: CreateOrderInput) {
    return this.request<{ order: Order; paymentIntent: PaymentIntent; tripOtp?: { pickup: string; drop: string } }>(
      '/customer/orders',
      {
        method: 'POST',
        body: JSON.stringify(input)
      }
    );
  }

  verifyRazorpayPayment(input: {
    orderId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) {
    return this.request<{ order: Order }>(`/customer/orders/${input.orderId}/payment/verify`, {
      method: 'POST',
      body: JSON.stringify({
        razorpayOrderId: input.razorpayOrderId,
        razorpayPaymentId: input.razorpayPaymentId,
        razorpaySignature: input.razorpaySignature
      })
    });
  }

  cancelOrder(orderId: string, reason: string) {
    return this.request<{ order?: Order }>(`/customer/orders/${orderId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }

  applyCoupon(code: string) {
    return this.request<{ user: UserProfile; addedCoins: number }>('/customer/wallet/coupon', {
      method: 'POST',
      body: JSON.stringify({ code })
    });
  }

  registerCustomerPushToken(token: string) {
    return this.request<{ user: UserProfile }>('/customer/push-token', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
  }

  createCloudinarySignature(input: { purpose: UploadPurpose; orderId?: string; documentKey?: string }) {
    return this.request<{ upload: CloudinarySignature }>('/uploads/cloudinary-signature', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  }

  partnerBootstrap() {
    return this.request<PartnerBootstrap>('/partner/bootstrap');
  }

  updatePartnerProfile(input: { name: string; email?: string; city: string; vehicleNumber?: string }) {
    return this.request<{ user: UserProfile }>('/partner/profile', {
      method: 'PATCH',
      body: JSON.stringify(input)
    });
  }

  setAvailability(online: boolean) {
    return this.request<{ user: UserProfile }>('/partner/availability', {
      method: 'POST',
      body: JSON.stringify({ online })
    });
  }

  registerPartnerPushToken(token: string) {
    return this.request<{ user: UserProfile }>('/partner/push-token', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
  }

  updatePartnerLocation(location: Required<Pick<PartnerLocation, 'lat' | 'lng'>> & Partial<PartnerLocation>) {
    return this.request<{ user: UserProfile; activeOrderCount: number }>('/partner/location', {
      method: 'POST',
      body: JSON.stringify(location)
    });
  }

  acceptOrder(orderId: string) {
    return this.request<{ order: Order }>(`/partner/orders/${orderId}/accept`, { method: 'POST' });
  }

  rejectOrder(orderId: string) {
    return this.request<{ order: Order; rejected: boolean }>(`/partner/orders/${orderId}/reject`, {
      method: 'POST'
    });
  }

  updateOrderStatus(orderId: string, status: 'arrived_pickup' | 'picked_up' | 'in_transit' | 'delivered') {
    return this.request<{ order: Order }>(`/partner/orders/${orderId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status })
    });
  }

  uploadPod(orderId: string, type: 'pickup' | 'drop', photoUrl: string) {
    return this.request<{ order: Order }>(`/partner/orders/${orderId}/pod`, {
      method: 'POST',
      body: JSON.stringify({ type, photoUrl })
    });
  }

  verifyOrderOtp(orderId: string, type: 'pickup' | 'drop', otp: string) {
    return this.request<{ order: Order; verified: boolean }>(`/partner/orders/${orderId}/otp/verify`, {
      method: 'POST',
      body: JSON.stringify({ type, otp })
    });
  }

  requestPayout(amount: number) {
    return this.request<{ reference: string; status: string; amount: number; user: UserProfile }>('/partner/payouts/request', {
      method: 'POST',
      body: JSON.stringify({ amount })
    });
  }

  uploadKyc(documentKey: 'selfie' | 'pan' | 'drivingLicence' | 'rc' | 'insurance' | 'bank', photoUrl?: string) {
    return this.request<{ user: UserProfile }>(`/partner/kyc/${documentKey}`, {
      method: 'POST',
      body: JSON.stringify({ photoUrl })
    });
  }
}

export async function uploadFileToCloudinary(
  fileUri: string,
  upload: CloudinarySignature,
  options: { fileName?: string; mimeType?: string } = {}
): Promise<CloudinaryUploadResult> {
  const form = new FormData();
  const append = form.append.bind(form) as (name: string, value: unknown) => void;
  append('file', {
    uri: fileUri,
    name: options.fileName ?? `indiery-${Date.now()}.jpg`,
    type: options.mimeType ?? 'image/jpeg'
  });
  append('api_key', upload.apiKey);
  append('timestamp', String(upload.timestamp));
  append('signature', upload.signature);
  append('folder', upload.folder);
  append('tags', upload.tags);

  const response = await fetch(upload.uploadUrl, {
    method: 'POST',
    body: form
  });

  const payload = (await response.json().catch(() => ({}))) as { secure_url?: string; public_id?: string; error?: { message?: string } };
  if (!response.ok || !payload.secure_url || !payload.public_id) {
    throw new Error(payload.error?.message ?? 'Cloudinary upload failed');
  }

  return {
    secureUrl: payload.secure_url,
    publicId: payload.public_id,
    provider: 'cloudinary'
  };
}
