import mongoose, { Schema } from "mongoose";

const SubComponentWeightSchema = new Schema(
  {
    komponen: { type: String, required: true },
    seksi: { type: String, enum: ["pemenuhan", "reform", "hasil"], required: true },
    sub_komponen: { type: String, required: true, default: "" },
    bobot_total: { type: Number, required: true, default: 0 },
    aktif: { type: Boolean, default: true },
  },
  { _id: false },
);

const PercentPolicySchema = new Schema(
  {
    question_id: { type: Number, required: true },
    type: {
      type: String,
      enum: ["direct_percent", "ratio", "decrease_ratio"],
      default: "direct_percent",
    },
    numerator_key: { type: String, default: "" },
    denominator_key: { type: String, default: "" },
    previous_key: { type: String, default: "" },
    current_key: { type: String, default: "" },
    cap_at_100: { type: Boolean, default: true },
    zero_division: {
      type: String,
      enum: ["full_score", "zero", "ignore"],
      default: "full_score",
    },
  },
  { _id: false },
);

const ZiScoringConfigSchema = new Schema(
  {
    version: { type: Number, required: true, default: 1 },
    is_active: { type: Boolean, default: true, index: true },
    lock_master_kriteria: { type: Boolean, default: true },
    rounding_scale: { type: Number, default: 10000 },
    notes: { type: String, default: "" },
    subcomponent_weights: { type: [SubComponentWeightSchema], default: [] },
    percent_policies: { type: [PercentPolicySchema], default: [] },
    updated_by: { type: String, default: "" },
  },
  { timestamps: true },
);

export default (mongoose.models.ZiScoringConfig as mongoose.Model<any>) ||
  mongoose.model("ZiScoringConfig", ZiScoringConfigSchema);

