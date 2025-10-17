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

    // Check Admin
    const admin = await UpgAdmin.findOne({ nip });

    if (!admin) {
      return NextResponse.json(
        { message: "NIP tidak ditemukan", success: false },
        { status: 404 }
      );
    }

    // Checka Password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: "Invalid login" },
        { status: 401 }
      );
    }

    // Generate Token
    const token = jwt.sign(
      { id: admin._id, nip: admin.nip },
      process.env.TOKEN_SECRET,
      { expiresIn: "2h" }
    );

    return NextResponse.json({
      success: true,
      message: "Login Berhasil",
      token,
      admin: { id: admin._id, nip: admin.nip, name: admin.name },
    });
  } catch (error) {
    console.error("Error login: ", error);
    return NextResponse.json(
      {
        message: "Terjadi Kesalahan Server",
        success: false,
      },
      { status: 500 }
    );
  }
}
