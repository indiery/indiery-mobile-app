import { Schema, model, InferSchemaType, HydratedDocument } from 'mongoose';

const VehicleSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    shortName: { type: String, required: true },
    icon: { type: String, required: true },
    capacityKg: { type: Number, required: true },
    baseFare: { type: Number, required: true },
    perKm: { type: Number, required: true },
    partnerShare: { type: Number, required: true },
    etaMinutes: { type: Number, required: true },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export type VehicleDocument = HydratedDocument<InferSchemaType<typeof VehicleSchema>>;
export const Vehicle = model('Vehicle', VehicleSchema);
