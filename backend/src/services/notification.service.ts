import { env } from '../config/env';

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
