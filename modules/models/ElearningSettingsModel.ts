import mongoose, { Schema, Document, Model } from "mongoose";

export interface ElearningSettingsDoc extends Document {
  key: "global";
  uploadEnabled: boolean;
  uploadDisabledMessage: string;
  tahunAktif: number | null;
  batchAktif: string;
  deadlineUpload: Date | null;
  adminContact: string;
  updatedBy: string | null;
  updatedAt: Date;
  createdAt: Date;
}

const ElearningSettingsSchema = new Schema<ElearningSettingsDoc>(
  {
    key: {
      type: String,
      enum: ["global"],
      required: true,
      unique: true,
      default: "global",
    },
    uploadEnabled: { type: Boolean, default: true },
    uploadDisabledMessage: {
      type: String,
      default: "Fitur upload sertifikat sedang tidak tersedia.",
    },
    tahunAktif: { type: Number, default: null },
    batchAktif: { type: String, default: "" },
    deadlineUpload: { type: Date, default: null },
    adminContact: {
      type: String,
      default: "Hubungi Admin E-Learning Inspektorat V Itjen ESDM.",
    },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true }
);

export const DEFAULT_ELEARNING_SETTINGS = {
  key: "global" as const,
  uploadEnabled: true,
  uploadDisabledMessage: "Fitur upload sertifikat sedang tidak tersedia.",
  tahunAktif: null,
  batchAktif: "",
  deadlineUpload: null,
  adminContact: "Hubungi Admin E-Learning Inspektorat V Itjen ESDM.",
  updatedBy: null,
};

const ElearningSettings: Model<ElearningSettingsDoc> =
  (mongoose.models.ElearningSettings as Model<ElearningSettingsDoc>) ||
  mongoose.model<ElearningSettingsDoc>(
    "ElearningSettings",
    ElearningSettingsSchema
  );

export default ElearningSettings;
