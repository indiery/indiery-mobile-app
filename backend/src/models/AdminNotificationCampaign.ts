import { InferSchemaType, Schema, model } from 'mongoose';

const AdminNotificationCampaignSchema = new Schema(
  {
    campaignId: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    audience: { type: String, enum: ['all_customers', 'all_drivers', 'pending_kyc_drivers', 'active_delivery_customers'], required: true },
    audienceSize: { type: Number, default: 0, min: 0 },
    attempted: { type: Number, default: 0, min: 0 },
    accepted: { type: Number, default: 0, min: 0 },
    rejected: { type: Number, default: 0, min: 0 },
    removedTokens: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['pending', 'no devices', 'sent', 'partial', 'failed'], default: 'pending', index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

AdminNotificationCampaignSchema.index({ createdAt: -1 });

export type AdminNotificationCampaignRecord = InferSchemaType<typeof AdminNotificationCampaignSchema>;
export const AdminNotificationCampaign = model('AdminNotificationCampaign', AdminNotificationCampaignSchema);
