import { Schema, model, InferSchemaType, HydratedDocument } from 'mongoose';

const PointSchema = new Schema(
  {
    label: { type: String, required: true },
    address: { type: String, required: true },
    lat: { type: Number },
    lng: { type: Number },
    contactName: { type: String },
    contactPhone: { type: String }
  },
  { _id: false }
);

const FareSchema = new Schema(
  {
    base: { type: Number, required: true },
    distance: { type: Number, required: true },
    gst: { type: Number, required: true },
    coins: { type: Number, default: 0 },
    total: { type: Number, required: true },
    partnerNet: { type: Number, required: true },
    platformCommission: { type: Number, required: true }
  },
  { _id: false }
);

const TimelineSchema = new Schema(
  {
    key: { type: String, required: true },
    title: { type: String, required: true },
    note: { type: String },
    state: { type: String, enum: ['done', 'active', 'pending'], required: true },
    at: { type: Date }
  },
  { _id: false }
);

const PodSchema = new Schema(
  {
    pickupPhotoUrl: { type: String },
    dropPhotoUrl: { type: String },
    pickupOtpVerified: { type: Boolean, default: false },
    dropOtpVerified: { type: Boolean, default: false }
  },
  { _id: false }
);

const PartnerLocationSchema = new Schema(
  {
    lat: { type: Number },
    lng: { type: Number },
    heading: { type: Number },
    speed: { type: Number },
    updatedAt: { type: Date }
  },
  { _id: false }
);

const OrderSchema = new Schema(
  {
    orderNo: { type: String, unique: true, index: true, required: true },
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    partner: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    vehicle: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    pickup: { type: PointSchema, required: true },
    drop: { type: PointSchema, required: true },
    goodsType: { type: String, required: true },
    weightKg: { type: Number, required: true },
    distanceKm: { type: Number, required: true },
    fare: { type: FareSchema, required: true },
    paymentMode: {
      type: String,
      enum: ['upi', 'card', 'wallet', 'netbanking', 'cash'],
      default: 'upi'
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'paid'
    },
    paymentProvider: { type: String, enum: ['demo', 'razorpay', 'cash'], default: 'demo' },
    paymentReference: { type: String },
    status: {
      type: String,
      enum: [
        'searching',
        'offered',
        'accepted',
        'arrived_pickup',
        'picked_up',
        'in_transit',
        'delivered',
        'cancelled'
      ],
      default: 'searching',
      index: true
    },
    etaMinutes: { type: Number, default: 10 },
    timeline: { type: [TimelineSchema], default: [] },
    pod: { type: PodSchema, default: {} },
    verification: {
      pickupOtpHash: { type: String },
      dropOtpHash: { type: String }
    },
    partnerLocation: { type: PartnerLocationSchema },
    cancellationReason: { type: String }
  },
  { timestamps: true }
);

export type OrderDocument = HydratedDocument<InferSchemaType<typeof OrderSchema>>;
export const Order = model('Order', OrderSchema);
