import type {
  CloudinarySignature,
  CloudinaryUploadResult,
  CreateOrderInput,
  CustomerWallet,
  CustomerBootstrap,
  FareBreakup,
  LocationDetails,
  LocationSuggestion,
  Order,
  PaymentIntent,
  PartnerBootstrap,
  PartnerLocation,
  Role,
  SavedAddress,
  TripOtp,
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
      ...(options.headers as Record<string, string> | undefined)
    };
    const hasContentType = Object.keys(headers).some((key) => key.toLowerCase() === 'content-type');
    if (options.body !== undefined && !hasContentType) headers['Content-Type'] = 'application/json';
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers
    });

    const responseText = await response.text().catch(() => '');
    let payload: unknown = {};
    if (responseText) {
      try {
        payload = JSON.parse(responseText);
      } catch {
        const snippet = responseText.trim().slice(0, 180);
        throw new ApiError(
          response.status || 0,
          snippet ? `Server returned invalid JSON: ${snippet}` : 'Server returned invalid JSON',
          { raw: responseText }
        );
      }
    }

    if (!response.ok) {
      const message =
        payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
          ? payload.message
          : 'Request failed';
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

  addSavedAddress(input: Omit<SavedAddress, 'id'>) {
    return this.request<{ user: UserProfile; savedAddress: SavedAddress }>('/customer/saved-addresses', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  }

  deleteSavedAddress(addressId: string) {
    return this.request<{ user: UserProfile }>('/customer/saved-addresses/' + encodeURIComponent(addressId), {
      method: 'DELETE'
    });
  }

  estimate(input: {
    pickup: string;
    drop: string;
    vehicleId: string;
    coins?: number;
    weightKg?: number;
    extraStops?: Array<{ label: string; address?: string; lat?: number; lng?: number }>;
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
    return this.request<{ order: Order; paymentIntent: PaymentIntent; tripOtp?: TripOtp }>(
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
    return this.request<{ user: UserProfile; addedCoins: number; alreadyApplied?: boolean }>('/customer/wallet/coupon', {
      method: 'POST',
      body: JSON.stringify({ code })
    });
  }

  customerWallet() {
    return this.request<{ wallet: CustomerWallet; user: UserProfile }>('/customer/wallet');
  }

  createWalletTopup(input: { amount: number; paymentMode: 'upi' | 'card' | 'netbanking' }) {
    return this.request<{ wallet: CustomerWallet; paymentIntent: PaymentIntent }>('/customer/wallet/topup', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  }

  verifyWalletTopup(input: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) {
    return this.request<{ wallet: CustomerWallet; user: UserProfile }>('/customer/wallet/topup/verify', {
      method: 'POST',
      body: JSON.stringify(input)
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

  updatePartnerProfile(input: { name: string; email?: string; city: string; vehicleId: string; vehicleNumber?: string }) {
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
    return this.request<{ order: Order }>(`/partner/orders/${orderId}/accept`, {
      method: 'POST',
      body: JSON.stringify({})
    });
  }

  rejectOrder(orderId: string) {
    return this.request<{ order: Order; rejected: boolean }>(`/partner/orders/${orderId}/reject`, {
      method: 'POST',
      body: JSON.stringify({})
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

  createPartnerWalletTopup(input: { amount: number; paymentMode: 'upi' | 'card' | 'netbanking' }) {
    return this.request<{ user: UserProfile; paymentIntent: PaymentIntent }>('/partner/wallet/topup', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  }

  verifyPartnerWalletTopup(input: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) {
    return this.request<{ user: UserProfile }>('/partner/wallet/topup/verify', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  }

  uploadKyc(
    documentKey: 'selfie' | 'pan' | 'aadhaar' | 'drivingLicence' | 'rc' | 'insurance' | 'bank',
    input?:
      | string
      | {
          photoUrl?: string;
          bankDetails?: {
            accountHolder: string;
            accountNumber: string;
            ifsc: string;
          };
        }
  ) {
    const body = typeof input === 'string' ? { photoUrl: input } : input ?? {};
    return this.request<{ user: UserProfile }>(`/partner/kyc/${documentKey}`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }
}

export async function uploadFileToCloudinary(
  fileUri: string,
  upload: CloudinarySignature,
  options: { fileName?: string; mimeType?: string } = {}
): Promise<CloudinaryUploadResult> {
  if (!fileUri || typeof fileUri !== 'string') {
    throw new Error('Captured photo is missing. Please retake the photo.');
  }

  const fileName = safeUploadFileName(options.fileName, fileUri);
  const mimeType = safeUploadMimeType(options.mimeType, fileName);
  let response: CloudinaryUploadHttpResponse;
  try {
    response = await uploadCloudinaryForm(upload.uploadUrl, await createBlobUploadForm(fileUri, upload, fileName, mimeType));
  } catch {
    response = await uploadCloudinaryNativeUriForm(upload.uploadUrl, createNativeUriUploadForm(fileUri, upload, fileName, mimeType));
  }

  return parseCloudinaryUploadResponse(response);
}

type CloudinaryUploadHttpResponse = {
  ok: boolean;
  json: () => Promise<unknown>;
};

function safeUploadFileName(fileName: string | undefined, fileUri: string) {
  const rawName = fileName || fileUri.split(/[\\/]/).pop()?.split('?')[0] || `indiery-${Date.now()}.jpg`;
  const safeName = rawName.replace(/[^a-zA-Z0-9._-]/g, '-');
  return /\.[a-zA-Z0-9]+$/.test(safeName) ? safeName : `${safeName}.jpg`;
}

function safeUploadMimeType(mimeType: string | undefined, fileName: string) {
  if (mimeType && /^[a-z]+\/[-+.a-z0-9]+$/i.test(mimeType)) return mimeType;
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'heic' || extension === 'heif') return 'image/heic';
  return 'image/jpeg';
}

function appendCloudinaryFields(form: FormData, upload: CloudinarySignature) {
  form.append('api_key', String(upload.apiKey));
  form.append('timestamp', String(upload.timestamp));
  form.append('signature', String(upload.signature));
  form.append('folder', String(upload.folder));
  form.append('tags', String(upload.tags));
}

async function createBlobUploadForm(fileUri: string, upload: CloudinarySignature, fileName: string, mimeType: string) {
  const fileResponse = await fetch(fileUri);
  const blob = await fileResponse.blob();
  const form = new FormData();
  const append = form.append.bind(form) as (name: string, value: Blob | string, fileName?: string) => void;
  append('file', blob.type ? blob : blob.slice(0, blob.size, mimeType), fileName);
  appendCloudinaryFields(form, upload);
  return form;
}

function createNativeUriUploadForm(fileUri: string, upload: CloudinarySignature, fileName: string, mimeType: string) {
  const form = new FormData();
  const append = form.append.bind(form) as (name: string, value: unknown) => void;
  append('file', {
    uri: fileUri,
    name: fileName,
    type: mimeType
  });
  appendCloudinaryFields(form, upload);
  return form;
}

async function uploadCloudinaryForm(uploadUrl: string, form: FormData) {
  const response = await fetch(uploadUrl, {
    method: 'POST',
    body: form
  });
  if (response.ok) return response;
  return response;
}

function uploadCloudinaryNativeUriForm(uploadUrl: string, form: FormData): Promise<CloudinaryUploadHttpResponse> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', uploadUrl);
    request.timeout = 60000;
    request.onload = () => {
      resolve({
        ok: request.status >= 200 && request.status < 300,
        json: async () => {
          try {
            return JSON.parse(request.responseText || '{}');
          } catch {
            return {};
          }
        }
      });
    };
    request.onerror = () => reject(new Error('Photo upload failed. Check your connection and try again.'));
    request.ontimeout = () => reject(new Error('Photo upload timed out. Please try again.'));
    request.onabort = () => reject(new Error('Photo upload was cancelled.'));
    request.send(form);
  });
}

async function parseCloudinaryUploadResponse(response: CloudinaryUploadHttpResponse): Promise<CloudinaryUploadResult> {
  const payload = (await response.json().catch(() => ({}))) as { secure_url?: string; public_id?: string; error?: { message?: string } };
  if (!response.ok || !payload.secure_url || !payload.public_id) {
    throw new Error(payload.error?.message ?? 'Photo upload failed. Please retake the photo and try again.');
  }

  return {
    secureUrl: payload.secure_url,
    publicId: payload.public_id,
    provider: 'cloudinary'
  };
}
