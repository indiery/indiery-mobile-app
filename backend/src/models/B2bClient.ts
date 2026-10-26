import { Schema, model, InferSchemaType, HydratedDocument } from 'mongoose';

const B2bClientSchema = new Schema(
  {
    companyName: { type: String, required: true, index: true },
    contactPerson: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    gstin: { type: String },
    city: { type: String },
    address: { type: String, required: true },
    contractType: {
      type: String,
      enum: ['on_demand', 'monthly_retainer', 'per_km_discount'],
      default: 'on_demand'
    },
    discountPercentage: { type: Number, default: 0 },
    creditLimit: { type: Number, default: 0 },
    outstandingBalance: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'paused'], default: 'active' }
  },
  { timestamps: true }
);

export type B2bClientDocument = HydratedDocument<InferSchemaType<typeof B2bClientSchema>>;
export const B2bClient = model('B2bClient', B2bClientSchema);
