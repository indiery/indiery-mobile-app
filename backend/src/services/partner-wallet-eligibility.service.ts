import { Types } from 'mongoose';
import { Order } from '../models/Order';
import { User } from '../models/User';
import { WalletLedger } from '../models/WalletLedger';

export const INITIAL_PARTNER_WALLET_BALANCE = 200;
export const MIN_POSITIVE_PARTNER_WALLET_BALANCE = 0.01;

export function canReceivePartnerOrders(balance: number, walletActivated: boolean) {
  return balance >= MIN_POSITIVE_PARTNER_WALLET_BALANCE &&
    (walletActivated || balance >= INITIAL_PARTNER_WALLET_BALANCE);
}

export async function activatePartnerWalletIfFunded(partnerId: string | Types.ObjectId) {
  await User.updateOne({
    _id: partnerId,
    role: 'partner',
    'partnerProfile.walletActivated': { $ne: true },
    'partnerProfile.walletBalance': { $gte: INITIAL_PARTNER_WALLET_BALANCE }
  }, {
    $set: { 'partnerProfile.walletActivated': true }
  });
}

/** Preserve the first-time funding milestone for drivers created before this field existed. */
export async function backfillPartnerWalletActivation() {
  const legacyPartners = await User.find({
    role: 'partner',
    'partnerProfile.walletActivated': { $exists: false }
  }).select('_id partnerProfile.walletBalance').lean();
  if (!legacyPartners.length) return;

  const legacyIds = legacyPartners.map((partner) => partner._id);
  const [fundedWallets, deliveredPartnerIds] = await Promise.all([
    WalletLedger.aggregate<{ _id: Types.ObjectId; total: number }>([
      {
        $match: {
          user: { $in: legacyIds },
          bucket: 'cash',
          kind: 'credit',
          settled: true,
          order: { $exists: false }
        }
      },
      { $group: { _id: '$user', total: { $sum: '$amount' } } },
      { $match: { total: { $gte: INITIAL_PARTNER_WALLET_BALANCE } } }
    ]),
    Order.distinct('partner', { partner: { $in: legacyIds }, status: 'delivered' })
  ]);

  const activatedIds = new Set<string>([
    ...legacyPartners
      .filter((partner) => (partner.partnerProfile?.walletBalance ?? 0) >= INITIAL_PARTNER_WALLET_BALANCE)
      .map((partner) => String(partner._id)),
    ...fundedWallets.map((wallet) => String(wallet._id)),
    ...deliveredPartnerIds.map(String)
  ]);

  if (activatedIds.size) {
    await User.updateMany({
      _id: { $in: [...activatedIds] },
      role: 'partner',
      'partnerProfile.walletActivated': { $exists: false }
    }, {
      $set: { 'partnerProfile.walletActivated': true }
    });
  }
  await User.updateMany({
    role: 'partner',
    'partnerProfile.walletActivated': { $exists: false }
  }, {
    $set: { 'partnerProfile.walletActivated': false }
  });
}
