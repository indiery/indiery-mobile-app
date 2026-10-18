import { InferSchemaType, Schema, model } from 'mongoose';

const AdminAuditEventSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', index: true, immutable: true },
    actorEmail: { type: String, trim: true, lowercase: true, maxlength: 254, immutable: true },
    action: { type: String, required: true, maxlength: 32, immutable: true },
    path: { type: String, required: true, maxlength: 256, immutable: true },
    statusCode: { type: Number, required: true, min: 100, max: 599, immutable: true },
    outcome: { type: String, enum: ['success', 'failure'], required: true, immutable: true },
    requestId: { type: String, required: true, maxlength: 80, immutable: true },
    createdAt: { type: Date, default: Date.now, immutable: true }
  },
  { versionKey: false, timestamps: false }
);
AdminAuditEventSchema.index({ createdAt: -1 });

export type AdminAuditEventRecord = InferSchemaType<typeof AdminAuditEventSchema>;
export const AdminAuditEvent = model('AdminAuditEvent', AdminAuditEventSchema);
