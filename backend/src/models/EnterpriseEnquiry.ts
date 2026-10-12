import { Schema, model, InferSchemaType, HydratedDocument } from 'mongoose';

const EnterpriseEnquirySchema = new Schema(
  {
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    companyName: { type: String, required: true, trim: true },
    contactName: { type: String, required: true, trim: true },
    mobileNumber: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    status: { type: String, enum: ['new', 'contacted', 'closed'], default: 'new', required: true, index: true }
  },
  { timestamps: true }
);

EnterpriseEnquirySchema.index({ createdAt: -1 });

export type EnterpriseEnquiryDocument = HydratedDocument<InferSchemaType<typeof EnterpriseEnquirySchema>>;
export const EnterpriseEnquiry = model('EnterpriseEnquiry', EnterpriseEnquirySchema);
