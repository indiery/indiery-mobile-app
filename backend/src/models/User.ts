import { Schema, model, InferSchemaType, HydratedDocument } from 'mongoose';

const PartnerProfileSchema = new Schema(
  {
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle' },
    vehicleNumber: { type: String },
    rating: { type: Number, default: 5 },
    online: { type: Boolean, default: false },
    walletBalance: { type: Number, default: 0 },
    weeklyOrders: { type: Number, default: 0 },
    cancellationDay: { type: String },
    cancellationsToday: { type: Number, default: 0 },
    kycStatus: {
      type: String,
      enum: ['not_started', 'pending', 'verified', 'rejected'],
      default: 'not_started'
    },
    docs: {
      selfie: { type: Boolean, default: false },
      pan: { type: Boolean, default: false },
      aadhaar: { type: Boolean, default: false },
      drivingLicence: { type: Boolean, default: false },
      rc: { type: Boolean, default: false },
      insurance: { type: Boolean, default: false },
      bank: { type: Boolean, default: false }
    },
    docUrls: {
      selfie: { type: String },
      pan: { type: String },
      aadhaar: { type: String },
      drivingLicence: { type: String },
      rc: { type: String },
      insurance: { type: String },
      bank: { type: String }
    },
    bankDetails: {
      accountHolder: { type: String },
      accountNumberMasked: { type: String },
      accountNumberLast4: { type: String },
      ifsc: { type: String }
    },
    currentLocation: {
      lat: { type: Number },
      lng: { type: Number },
      heading: { type: Number },
      speed: { type: Number },
      updatedAt: { type: Date }
    }
  },
  { _id: false }
);

const CustomerProfileSchema = new Schema(
  {
    coins: { type: Number, default: 0 },
    walletBalance: { type: Number, default: 0 },
    savedAddresses: [{ type: Schema.Types.Mixed }],
    usedCoupons: [{ type: String }]
  },
  { _id: false }
);

const UserSchema = new Schema(
  {
    role: { type: String, enum: ['customer', 'partner', 'admin'], required: true, index: true },
    name: { type: String, required: true },
    initials: { type: String, required: true },
    phone: { type: String, required: true, index: true },
    email: { type: String },
    city: { type: String, default: 'Lucknow' },
    status: { type: String, enum: ['active', 'blocked'], default: 'active' },
    expoPushTokens: [{ type: String }],
    customerProfile: { type: CustomerProfileSchema },
    partnerProfile: { type: PartnerProfileSchema }
  },
  { timestamps: true }
);

export type UserDocument = HydratedDocument<InferSchemaType<typeof UserSchema>>;
UserSchema.index({ phone: 1, role: 1 }, { unique: true });
export const User = model('User', UserSchema);
