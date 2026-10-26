import { Schema, model } from 'mongoose';

const PushReceiptSchema = new Schema(
  {
    receiptId: { type: String, required: true, unique: true, index: true },
    token: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    nextCheckAt: { type: Date, required: true, index: true },
    expiresAt: { type: Date, required: true, expires: 0 }
  },
  { timestamps: true }
);

export const PushReceipt = model('PushReceipt', PushReceiptSchema);
