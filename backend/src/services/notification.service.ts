import { env } from '../config/env';

export async function sendSms(phone: string, message: string) {
  if (env.MSG91_AUTH_KEY) {
    await fetch('https://api.msg91.com/api/v5/flow/', {
      method: 'POST',
      headers: {
        authkey: env.MSG91_AUTH_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        mobiles: phone,
        message
      })
    }).catch(() => undefined);
    return { provider: 'msg91' as const };
  }

  if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM_PHONE) {
    const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64');
    const form = new URLSearchParams({
      To: phone.startsWith('+') ? phone : `+91${phone}`,
      From: env.TWILIO_FROM_PHONE,
      Body: message
    });
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: form.toString()
    }).catch(() => undefined);
    return { provider: 'twilio' as const };
  }

  return { provider: 'dev' as const };
}

export async function sendPush(tokens: string[] | undefined, title: string, body: string, data?: Record<string, unknown>) {
  const uniqueTokens = [...new Set(tokens ?? [])].filter(Boolean);
  if (!uniqueTokens.length) return { sent: 0 };

  const messages = uniqueTokens.map((to) => ({
    to,
    title,
    body,
    data: data ?? {},
    sound: 'default'
  }));

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${env.EXPO_ACCESS_TOKEN}` } : {})
    },
    body: JSON.stringify(messages)
  }).catch(() => undefined);

  return { sent: uniqueTokens.length };
}
