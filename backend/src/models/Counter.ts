import { Schema, model } from 'mongoose';

const CounterSchema = new Schema(
  {
    key: { type: String, unique: true, required: true },
    value: { type: Number, default: 1000 }
  },
  { timestamps: true }
);

export const Counter = model('Counter', CounterSchema);
