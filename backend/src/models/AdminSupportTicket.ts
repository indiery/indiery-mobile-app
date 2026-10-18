import { InferSchemaType, Schema, model } from 'mongoose';

const AdminSupportTicketSchema = new Schema(
  {
    ticketNo: { type: String, required: true, unique: true, index: true },
    party: { type: String, enum: ['Customer', 'Driver', 'Business'], required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    contact: { type: String, trim: true, maxlength: 160 },
    booking: { type: String, trim: true, maxlength: 80 },
    category: { type: String, required: true, trim: true, maxlength: 100 },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium', index: true },
    description: { type: String, trim: true, maxlength: 10_000, default: '' },
    status: { type: String, enum: ['open', 'waiting', 'escalated', 'resolved'], default: 'open', index: true },
    assignee: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    resolvedAt: { type: Date }
  },
  { timestamps: true }
);

AdminSupportTicketSchema.index({ status: 1, priority: -1, updatedAt: -1 });

export type AdminSupportTicketRecord = InferSchemaType<typeof AdminSupportTicketSchema>;
export const AdminSupportTicket = model('AdminSupportTicket', AdminSupportTicketSchema);
