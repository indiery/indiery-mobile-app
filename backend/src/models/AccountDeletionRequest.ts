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
    status: { type: String, enum: ['requested', 'reviewing', 'completed', 'rejected'], default: 'requested', index: true },
    completedAt: { type: Date }
  },
  { timestamps: true }
);

export type AccountDeletionRequestDocument = HydratedDocument<InferSchemaType<typeof AccountDeletionRequestSchema>>;
export const AccountDeletionRequest = model('AccountDeletionRequest', AccountDeletionRequestSchema);
