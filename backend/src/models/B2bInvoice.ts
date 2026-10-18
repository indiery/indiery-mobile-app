import { InferSchemaType, Schema, model } from 'mongoose';

const B2bInvoiceLineSchema = new Schema(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    orderNo: { type: String, required: true },
    description: { type: String, required: true },
    serviceDate: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const B2bInvoicePaymentSchema = new Schema(
  {
    amount: { type: Number, required: true, min: 0.01 },
    reference: { type: String, required: true, trim: true, maxlength: 160 },
    receivedAt: { type: Date, required: true },
    note: { type: String, trim: true, maxlength: 500 },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { _id: false }
);

const B2bInvoiceSchema = new Schema(
  {
    invoiceNo: { type: String, required: true, unique: true, index: true },
    client: { type: Schema.Types.ObjectId, ref: 'B2bClient', required: true, index: true },
    companySnapshot: {
      companyName: { type: String, required: true },
      address: { type: String, required: true },
      gstin: { type: String },
      contactPerson: { type: String, required: true },
      email: { type: String },
      phone: { type: String, required: true }
    },
    lines: { type: [B2bInvoiceLineSchema], required: true, validate: (value: unknown[]) => value.length > 0 },
    subtotal: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, required: true, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, required: true, default: 0, min: 0 },
    dueDate: { type: Date },
    status: { type: String, enum: ['issued', 'partially_paid', 'paid', 'void'], default: 'issued', index: true },
    payments: { type: [B2bInvoicePaymentSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

B2bInvoiceSchema.index({ client: 1, status: 1, createdAt: -1 });

export type B2bInvoiceRecord = InferSchemaType<typeof B2bInvoiceSchema>;
export const B2bInvoice = model('B2bInvoice', B2bInvoiceSchema);
