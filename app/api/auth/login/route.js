import { connect } from "@/config/dbconfig";
import UpgAdmin from "@/modules/models/UpgAdminModel";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export async function POST(req) {
  try {
    await connect();
    const { nip, password } = await req.json();

    const admin = await UpgAdmin.findOne({ nip });
    if (!admin) {
      return NextResponse.json(
        { message: "NIP tidak ditemukan", success: false },
        { status: 404 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { message: "Password salah", success: false },
        { status: 401 }
      );
    }

    const token = jwt.sign(
      { id: admin._id, nip: admin.nip },
      process.env.TOKEN_SECRET,
      { expiresIn: "2h" }
    );

    const response = NextResponse.json({
      success: true,
      message: "Login Berhasil",
      admin: {
        id: admin._id,
        nip: admin.nip,
        name: admin.name,
      },
    });

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
