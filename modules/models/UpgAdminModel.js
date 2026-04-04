import mongoose from "mongoose";

const UpgSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a name"],
      trim: true,
    },
    nip: { type: String, required: [true, "Please provide a NIP"], trim: true },
    jabatan: { type: String, required: true, trim: true },
    unitKerja: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    noTelp: { type: String, required: true, trim: true },
    password: { type: String, required: [true, "Please provide a password"] },
    role: {
      type: String,
      enum: ["upg", "zi", "admin"],
      default: "upg",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const UpgAdmin =
  mongoose.models.UpgAdmin || mongoose.model("UpgAdmin", UpgSchema);
  
export default UpgAdmin;
