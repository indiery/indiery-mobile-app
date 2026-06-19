import { Schema, model, InferSchemaType, HydratedDocument } from 'mongoose';
import { normalizeFareBreakup } from '../services/fare.service';

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
    orderValue: { type: Number, required: true },
    billableKm: { type: Number, required: true },
    base: { type: Number, required: true },
    distance: { type: Number, required: true },
    gst: { type: Number, required: true },
    coins: { type: Number, default: 0 },
    total: { type: Number, required: true },
    driverCommission: { type: Number, required: true },
    reserveAmount: { type: Number, required: true },
    partnerNet: { type: Number, required: true },
    platformCommission: { type: Number, required: true },
    lateDriverPenalty: { type: Number, required: true },
    latePlatformPenalty: { type: Number, required: true },
    lateRefundCoins: { type: Number, required: true },
    onTimePartnerPayout: { type: Number, required: true },
    latePartnerPayout: { type: Number, required: true }
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

const SettlementSchema = new Schema(
  {
    delayed: { type: Boolean, default: false },
    partnerCredit: { type: Number, default: 0 },
    customerRefundCoins: { type: Number, default: 0 },
    driverPenalty: { type: Number, default: 0 },
    platformPenalty: { type: Number, default: 0 },
    reserveReleasedTo: { type: String, enum: ['partner', 'customer'], default: 'partner' },
    settledAt: { type: Date }
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
    extraStops: { type: [PointSchema], default: [] },
    drop: { type: PointSchema, required: true },
    goodsType: { type: String, required: true },
    weightKg: { type: Number, required: true },
    distanceKm: { type: Number, required: true },
    fare: { type: FareSchema, required: true },
    paymentMode: {
      type: String,
      enum: ['upi', 'card', 'netbanking', 'cash', 'wallet'],
      default: 'upi'
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending'
    },
    paymentProvider: { type: String, enum: ['razorpay', 'cash', 'wallet'], default: 'razorpay' },
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
    settlement: { type: SettlementSchema },
    cancellationReason: { type: String }
  },
  { timestamps: true }
);

export type OrderDocument = HydratedDocument<InferSchemaType<typeof OrderSchema>>;
OrderSchema.pre('validate', function normalizeLegacyFare(next) {
  if (this.fare) {
    this.set('fare', normalizeFareBreakup(this.fare, this.distanceKm));
  }
  next();
});
export const Order = model('Order', OrderSchema);
