import { env } from '../config/env';

export interface PaymentIntentInput {
  orderNo: string;
  amount: number;
  paymentMode: 'upi' | 'card' | 'wallet' | 'netbanking' | 'cash';
}

export interface PaymentIntent {
  provider: 'demo' | 'razorpay' | 'cash';
  reference: string;
  status: 'pending' | 'paid';
  amount: number;
  currency: 'INR';
  checkout?: {
    keyId: string;
    orderId: string;
  };
}

export async function createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntent> {
  if (input.paymentMode === 'cash') {
    return {
      provider: 'cash',
      reference: `cash_${input.orderNo}`,
      status: 'pending',
      amount: input.amount,
      currency: 'INR'
    };
  }

  if (input.paymentMode === 'wallet' || !env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    return {
      provider: 'demo',
      reference: `demo_${input.orderNo}_${Date.now()}`,
      status: 'paid',
      amount: input.amount,
      currency: 'INR'
    };
  }

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
    throw new Error('Payment provider rejected the order');
  }
  const payload = (await response.json()) as { id: string };
  return {
    provider: 'razorpay',
    reference: payload.id,
    status: 'pending',
    amount: input.amount,
    currency: 'INR',
    checkout: {
      keyId: env.RAZORPAY_KEY_ID,
      orderId: payload.id
    }
  };
}

export function isPaymentAutoPaid(provider: PaymentIntent['provider'], mode: PaymentIntentInput['paymentMode']) {
  return provider === 'demo' || mode === 'wallet';
}
