import { User } from '../models/User';
import { WalletLedger } from '../models/WalletLedger';
import { ApiError } from '../middleware/error';

export async function requestPartnerPayout(partnerId: string, amount: number) {
  const partner = await User.findById(partnerId);
  if (!partner || partner.role !== 'partner') throw new ApiError(404, 'Partner not found');
  const balance = partner.partnerProfile?.walletBalance ?? 0;
  if (amount <= 0) throw new ApiError(400, 'Payout amount must be greater than zero');
  if (amount > balance) throw new ApiError(400, 'Insufficient wallet balance');

  const reference = `payout_request_${Date.now()}`;

  partner.set('partnerProfile.walletBalance', Number((balance - amount).toFixed(2)));
  await partner.save();
  await WalletLedger.create({
    user: partner._id,
    amount,
    kind: 'debit',
    bucket: 'cash',
    title: 'Payout to bank',
    reference
  });

  return {
    reference,
    status: 'pending_review',
    amount,
    user: partner
  };
}
