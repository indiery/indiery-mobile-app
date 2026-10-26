import { Schema, model, InferSchemaType, HydratedDocument } from 'mongoose';

const WalletLedgerSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order' },
    amount: { type: Number, required: true },
    kind: { type: String, enum: ['credit', 'debit'], required: true },
    bucket: { type: String, enum: ['cash', 'coins'], default: 'cash', index: true },
    title: { type: String, required: true },
    reference: { type: String },
    settled: { type: Boolean, default: false }
  },
  { timestamps: true }
);

WalletLedgerSchema.index({ user: 1, bucket: 1, createdAt: -1 });
WalletLedgerSchema.index({ user: 1, createdAt: -1 });

export type WalletLedgerDocument = HydratedDocument<InferSchemaType<typeof WalletLedgerSchema>>;
export const WalletLedger = model('WalletLedger', WalletLedgerSchema);
