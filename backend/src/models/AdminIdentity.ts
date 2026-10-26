import { InferSchemaType, Schema, model } from 'mongoose';

export const ADMIN_ROLE_KEYS = [
  'super_admin',
  'operations_manager',
  'kyc_executive',
  'support_executive',
  'finance_manager',
  'city_manager'
] as const;

const AdminIdentitySchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    roleKey: { type: String, enum: ADMIN_ROLE_KEYS, required: true, index: true },
    cityScope: [{ type: String, trim: true, maxlength: 100 }],
    status: { type: String, enum: ['invited', 'active', 'deactivated'], required: true, default: 'invited', index: true },
    passwordHash: { type: String, select: false },
    invitationTokenHash: { type: String, select: false, sparse: true, index: true },
    invitationExpiresAt: { type: Date, select: false },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastLoginAt: { type: Date }
  },
  { timestamps: true }
);

export type AdminIdentityRecord = InferSchemaType<typeof AdminIdentitySchema>;
export const AdminIdentity = model('AdminIdentity', AdminIdentitySchema);
