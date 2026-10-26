import { Schema, model, InferSchemaType, HydratedDocument } from 'mongoose';

const AccountDeletionRequestSchema = new Schema(
  {
    role: { type: String, enum: ['customer', 'partner'], required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    name: { type: String },
    phone: { type: String, required: true, index: true },
    email: { type: String },
    reason: { type: String },
    source: { type: String, enum: ['in_app', 'web'], required: true },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified'],
      default: 'pending',
      required: true,
      index: true
    },
    verifiedAt: { type: Date },
    status: { type: String, enum: ['requested', 'reviewing', 'completed', 'rejected'], default: 'requested', index: true },
    lastRequestedAt: { type: Date, required: true, default: Date.now },
    requestCount: { type: Number, required: true, default: 1, min: 1 },
    completedAt: { type: Date }
  },
  { timestamps: true }
);

AccountDeletionRequestSchema.index({ role: 1, phone: 1, status: 1, createdAt: -1 });
AccountDeletionRequestSchema.index({ user: 1, status: 1, createdAt: -1 });

export type AccountDeletionRequestDocument = HydratedDocument<InferSchemaType<typeof AccountDeletionRequestSchema>>;
export const AccountDeletionRequest = model('AccountDeletionRequest', AccountDeletionRequestSchema);
