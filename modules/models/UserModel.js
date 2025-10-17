import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    nama: { type: String, required: true, trim: true },
    nip: { type: String, trim: true },
    jabatan: { type: String, trim: true },
    unitKerja: { type: String, trim: true },
    alamatKantor: { type: String, trim: true },
    noTelepon: { type: String, trim: true },
    email: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
