import { connect } from "@/config/dbconfig";
import UpgAdmin from "@/modules/models/UpgAdminModel";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

function getCallerRole(req) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return null;
    const payload = jwt.verify(token, process.env.TOKEN_SECRET);
    return payload.role ?? null;
  } catch {
    return null;
  }
}

const CREATABLE_BY = {
  developer: ["admin", "zi", "upg"],
  admin: ["zi", "upg"],
};

export async function POST(req) {
  await connect();

  try {
    const callerRole = getCallerRole(req);

    if (!callerRole || !CREATABLE_BY[callerRole]) {
      return NextResponse.json(
        { error: "Anda tidak memiliki izin untuk membuat akun" },
        { status: 403 },
      );
    }

    const reqBody = await req.json();
    const { name, nip, jabatan, unitKerja, email, noTelp, password, role } =
      reqBody;

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
        { status: 400 },
      );
    }

    // Validate role permission
    const allowedRoles = CREATABLE_BY[callerRole];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: `Anda tidak dapat membuat akun dengan role "${role}"` },
        { status: 403 },
      );
    }

    // Developer role can never be created via register — max 1, created manually
    if (role === "developer") {
      return NextResponse.json(
        { error: "Role developer tidak dapat dibuat melalui register" },
        { status: 403 },
      );
    }

    // Check existing admin
    const existingAdmin = await UpgAdmin.findOne({ $or: [{ nip }, { email }] });
    if (existingAdmin) {
      return NextResponse.json(
        { error: "Admin already exists" },
        { status: 400 },
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
      role,
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
