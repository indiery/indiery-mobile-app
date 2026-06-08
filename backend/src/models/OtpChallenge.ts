import { Schema, model, InferSchemaType, HydratedDocument } from 'mongoose';

const OtpChallengeSchema = new Schema(
  {
    phone: { type: String, required: true, index: true },
    role: { type: String, enum: ['customer', 'partner'], required: true },
    purpose: { type: String, enum: ['login'], default: 'login' },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    consumedAt: { type: Date }
  },
  { timestamps: true }
);

export type OtpChallengeDocument = HydratedDocument<InferSchemaType<typeof OtpChallengeSchema>>;
export const OtpChallenge = model('OtpChallenge', OtpChallengeSchema);
