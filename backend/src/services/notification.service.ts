import { env } from '../config/env';
import { PushReceipt } from '../models/PushReceipt';
import { User } from '../models/User';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';
const EXPO_CHUNK_SIZE = 100;
const RECEIPT_CHUNK_SIZE = 1000;
const RECEIPT_INITIAL_DELAY_MS = 15 * 60_000;
const RECEIPT_RETRY_DELAY_MS = 5 * 60_000;
const RECEIPT_TTL_MS = 24 * 60 * 60_000;

type ExpoErrorDetails = { error?: string };
type ExpoTicket =
  | { status: 'ok'; id: string }
  | { status: 'error'; message?: string; details?: ExpoErrorDetails };
type ExpoReceipt =
  | { status: 'ok' }
  | { status: 'error'; message?: string; details?: ExpoErrorDetails };

export type PushOptions = {
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
  ttl?: number;
  expiration?: number;
  collapseId?: string;
};

export type PushResult = {
  attempted: number;
  accepted: number;
  rejected: number;
  removedTokens: number;
};

export function isExpoPushToken(token: string) {
  return /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/.test(token);
}

async function removePushTokens(tokens: string[]) {
  const uniqueTokens = [...new Set(tokens)].filter(Boolean);
  if (!uniqueTokens.length) return 0;
  await User.updateMany(
    { expoPushTokens: { $in: uniqueTokens } },
    { $pull: { expoPushTokens: { $in: uniqueTokens } } }
  );
  return uniqueTokens.length;
}

export async function registerPushToken(userId: string, token: string) {
  if (!isExpoPushToken(token)) throw new Error('Invalid Expo push token');

  // A physical device must belong to only the currently authenticated account.
  await User.updateMany(
    { _id: { $ne: userId }, expoPushTokens: token },
    { $pull: { expoPushTokens: token } }
  );
  return User.findByIdAndUpdate(userId, { $addToSet: { expoPushTokens: token } }, { new: true });
}

export async function unregisterPushToken(userId: string, token: string) {
  return User.findByIdAndUpdate(userId, { $pull: { expoPushTokens: token } }, { new: true });
}

function chunks<T>(values: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function expoRequest<T>(url: string, body: unknown): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${env.EXPO_ACCESS_TOKEN}` } : {})
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      const responseText = await response.text();
      if (response.ok) return JSON.parse(responseText) as T;

      const error = new Error(`Expo push service returned HTTP ${response.status}: ${responseText.slice(0, 300)}`);
      if (response.status !== 429 && response.status < 500) throw error;
      lastError = error;
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
    if (attempt < 2) await wait(500 * 2 ** attempt);
  }
  throw lastError instanceof Error ? lastError : new Error('Expo push service request failed');
}

async function rememberReceipts(receipts: Array<{ receiptId: string; token: string }>) {
  if (!receipts.length) return;
  const now = Date.now();
  await PushReceipt.insertMany(
    receipts.map((receipt) => ({
      ...receipt,
      nextCheckAt: new Date(now + RECEIPT_INITIAL_DELAY_MS),
      expiresAt: new Date(now + RECEIPT_TTL_MS)
    })),
    { ordered: false }
  ).catch((error: unknown) => {
    console.error('Unable to persist Expo push receipts', error);
  });
}

export async function sendPush(
  tokens: string[] | undefined,
  title: string,
  body: string,
  data: Record<string, unknown> = {},
  options: PushOptions = {}
): Promise<PushResult> {
  const uniqueTokens = [...new Set(tokens ?? [])].filter(Boolean);
  const validTokens = uniqueTokens.filter(isExpoPushToken);
  const malformedTokens = uniqueTokens.filter((token) => !isExpoPushToken(token));
  let removedTokens = 0;

  try {
    removedTokens += await removePushTokens(malformedTokens);
    if (!validTokens.length) {
      return { attempted: uniqueTokens.length, accepted: 0, rejected: malformedTokens.length, removedTokens };
    }

    let accepted = 0;
    let rejected = malformedTokens.length;
    const deviceNotRegistered: string[] = [];
    const pendingReceipts: Array<{ receiptId: string; token: string }> = [];

    for (const tokenChunk of chunks(validTokens, EXPO_CHUNK_SIZE)) {
      const messages = tokenChunk.map((to) => ({
        to,
        title,
        body,
        data,
        sound: 'default',
        channelId: options.channelId ?? 'orders',
        priority: options.priority ?? 'high',
        ...(options.ttl !== undefined ? { ttl: options.ttl } : {}),
        ...(options.expiration !== undefined ? { expiration: options.expiration } : {}),
        ...(options.collapseId ? { collapseId: options.collapseId } : {})
      }));
      const response = await expoRequest<{ data?: ExpoTicket[] | ExpoTicket }>(EXPO_PUSH_URL, messages);
      const tickets = Array.isArray(response.data) ? response.data : response.data ? [response.data] : [];

      tokenChunk.forEach((token, index) => {
        const ticket = tickets[index];
        if (ticket?.status === 'ok') {
          accepted += 1;
          pendingReceipts.push({ receiptId: ticket.id, token });
          return;
        }
        rejected += 1;
        console.error('Expo rejected a push notification', {
          error: ticket?.status === 'error' ? ticket.details?.error : 'MissingTicket',
          message: ticket?.status === 'error' ? ticket.message : undefined
        });
        if (ticket?.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
          deviceNotRegistered.push(token);
        }
      });
    }

    await rememberReceipts(pendingReceipts);
    removedTokens += await removePushTokens(deviceNotRegistered);
    return { attempted: uniqueTokens.length, accepted, rejected, removedTokens };
  } catch (error) {
    console.error('Expo push delivery failed', error);
    return {
      attempted: uniqueTokens.length,
      accepted: 0,
      rejected: uniqueTokens.length,
      removedTokens
    };
  }
}

let receiptWorker: NodeJS.Timeout | undefined;
let receiptWorkerRunning = false;

async function processPushReceipts() {
  if (receiptWorkerRunning) return;
  receiptWorkerRunning = true;
  try {
    const pending = await PushReceipt.find({ nextCheckAt: { $lte: new Date() } })
      .sort({ nextCheckAt: 1 })
      .limit(RECEIPT_CHUNK_SIZE);
    if (!pending.length) return;

    const ids = pending.map((item) => item.receiptId);
    const response = await expoRequest<{ data?: Record<string, ExpoReceipt> }>(EXPO_RECEIPTS_URL, { ids });
    const completedIds: string[] = [];
    const deviceNotRegistered: string[] = [];
    const missingIds: string[] = [];

    pending.forEach((item) => {
      const receipt = response.data?.[item.receiptId];
      if (!receipt) {
        missingIds.push(item.receiptId);
        return;
      }
      completedIds.push(item.receiptId);
      if (receipt.status === 'error') {
        console.error('Expo push receipt reported an error', {
          receiptId: item.receiptId,
          error: receipt.details?.error,
          message: receipt.message
        });
        if (receipt.details?.error === 'DeviceNotRegistered') deviceNotRegistered.push(item.token);
      }
    });

    await Promise.all([
      completedIds.length ? PushReceipt.deleteMany({ receiptId: { $in: completedIds } }) : Promise.resolve(),
      missingIds.length
        ? PushReceipt.updateMany(
            { receiptId: { $in: missingIds } },
            { $inc: { attempts: 1 }, $set: { nextCheckAt: new Date(Date.now() + RECEIPT_RETRY_DELAY_MS) } }
          )
        : Promise.resolve(),
      removePushTokens(deviceNotRegistered)
    ]);
  } catch (error) {
    console.error('Unable to process Expo push receipts', error);
  } finally {
    receiptWorkerRunning = false;
  }
}

export function startPushReceiptWorker() {
  if (receiptWorker) return () => undefined;
  void processPushReceipts();
  receiptWorker = setInterval(() => void processPushReceipts(), 60_000);
  receiptWorker.unref();
  return () => {
    if (receiptWorker) clearInterval(receiptWorker);
    receiptWorker = undefined;
  };
}
