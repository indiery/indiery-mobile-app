import crypto from 'crypto';
import { env } from '../config/env';
import { ApiError } from '../middleware/error';

export interface PaymentIntentInput {
  orderNo: string;
  amount: number;
  paymentMode: 'upi' | 'card' | 'netbanking' | 'cash' | 'wallet';
}

export interface PaymentIntent {
  provider: 'razorpay' | 'cash' | 'wallet';
  reference: string;
  status: 'pending' | 'paid';
  amount: number;
  currency: 'INR';
  checkout?: {
    keyId: string;
    orderId: string;
  };
}

function requireRazorpayConfig() {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new ApiError(503, 'Online payments are not configured');
  }
}

export async function createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntent> {
  if (input.amount <= 0) {
    return {
      provider: 'wallet',
      reference: `coins_${input.orderNo}`,
      status: 'paid',
      amount: 0,
      currency: 'INR'
    };
  }

  if (input.paymentMode === 'wallet') {
    return {
      provider: 'wallet',
      reference: `wallet_${input.orderNo}`,
      status: 'paid',
      amount: input.amount,
      currency: 'INR'
    };
  }

  if (input.paymentMode === 'cash') {
    return {
      provider: 'cash',
      reference: `cash_${input.orderNo}`,
      status: 'pending',
      amount: input.amount,
      currency: 'INR'
    };
  }

  requireRazorpayConfig();

  const auth = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64');
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: Math.round(input.amount * 100),
      currency: 'INR',
      receipt: input.orderNo,
      notes: { orderNo: input.orderNo }
    })
  });

  if (!response.ok) {
    throw new ApiError(502, 'Payment provider rejected the order');
  }
  const payload = (await response.json()) as { id?: string };
  if (!payload.id) throw new ApiError(502, 'Payment provider returned an invalid order');

  return {
    provider: 'razorpay',
    reference: payload.id,
    status: 'pending',
    amount: input.amount,
    currency: 'INR',
    checkout: {
      keyId: env.RAZORPAY_KEY_ID!,
      orderId: payload.id
    }
  };
}

function safeEqualHex(left: string, right: string) {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyRazorpayPaymentSignature(input: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  requireRazorpayConfig();
  const payload = `${input.razorpayOrderId}|${input.razorpayPaymentId}`;
  const expected = crypto.createHmac('sha256', env.RAZORPAY_KEY_SECRET!).update(payload).digest('hex');
  return safeEqualHex(expected, input.razorpaySignature);
}

export function verifyRazorpayWebhookSignature(rawBody: Buffer, signature: string | undefined) {
  if (!env.RAZORPAY_WEBHOOK_SECRET || !signature) return false;
  const expected = crypto.createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex');
  return safeEqualHex(expected, signature);
}
