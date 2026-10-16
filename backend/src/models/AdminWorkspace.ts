import { InferSchemaType, Schema, model } from 'mongoose';

const AdminWorkspaceSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: Schema.Types.Mixed, required: true },
    updatedBy: { type: String }
  },
  { timestamps: true }
);

export type AdminWorkspaceRecord = InferSchemaType<typeof AdminWorkspaceSchema>;
export const AdminWorkspace = model('AdminWorkspace', AdminWorkspaceSchema);
