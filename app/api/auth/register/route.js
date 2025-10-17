import { connect } from "@/config/dbconfig";
import UpgAdmin from "@/modules/models/UpgAdminModel";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req) {
  await connect();

  try {
    const reqBody = await req.json();
    const { name, nip, jabatan, unitKerja, email, noTelp, password } = reqBody;

    // Simple validation
    if (
      !name ||
      !nip ||
      !jabatan ||
      !unitKerja ||
      !email ||
      !noTelp ||
      !password
    ) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Check existing admin
    const existingAdmin = await UpgAdmin.findOne({ $or: [{ nip }, { email }] });
    if (existingAdmin) {
      return NextResponse.json(
        { error: "Admin already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin
    const newAdmin = new UpgAdmin({
      name,
      nip,
      jabatan,
      unitKerja,
      email,
      noTelp,
      password: hashedPassword,
    });

    await newAdmin.save();

    // Hide password
    const adminResponse = newAdmin.toObject();
    delete adminResponse.password;

    return NextResponse.json({
      message: "Admin successfully created",
      success: true,
      admin: adminResponse,
    });
  } catch (error) {
    console.error("Error creating admin:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
