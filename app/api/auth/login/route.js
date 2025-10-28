import { connect } from "@/config/dbconfig";
import UpgAdmin from "@/modules/models/UpgAdminModel";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export async function POST(req) {
  try {
    await connect();
    const reqBody = await req.json();
    const { nip, password } = reqBody;

    // 🔍 Cek apakah admin terdaftar
    const admin = await UpgAdmin.findOne({ nip });
    if (!admin) {
      return NextResponse.json(
        { message: "NIP tidak ditemukan", success: false },
        { status: 404 }
      );
    }

    // 🔐 Verifikasi password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: "Password salah" },
        { status: 401 }
      );
    }

    // 🧩 Buat token JWT
    const token = jwt.sign(
      { id: admin._id, nip: admin.nip },
      process.env.TOKEN_SECRET,
      { expiresIn: "2h" }
    );

    // localStorage.setItem("Token", token);

    // ✅ Buat response dan set cookie
    const response = NextResponse.json({
      success: true,
      message: "Login Berhasil",
      admin: {
        id: admin._id,
        nip: admin.nip,
        name: admin.name,
      },
    });

    // Simpan token ke cookie
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 2 * 60 * 60, // 2 jam
    });

    return response;
  } catch (error) {
    console.error("Error login: ", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server", success: false },
      { status: 500 }
    );
  }
}
