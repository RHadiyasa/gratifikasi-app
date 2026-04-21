import { connect } from "@/config/dbconfig";
import UpgAdmin from "@/modules/models/UpgAdminModel";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

function getCallerRole(req) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return null;
    const payload = jwt.verify(token, process.env.TOKEN_SECRET);
    return { role: payload.role ?? null, id: payload.id };
  } catch {
    return null;
  }
}

// PATCH /api/auth/users/[id] — edit user (developer only)
export async function PATCH(req, { params }) {
  const caller = getCallerRole(req);

  if (!caller || caller.role !== "developer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    await connect();
    const { id } = await params;
    const body = await req.json();

    // Cannot edit your own developer account role
    const target = await UpgAdmin.findById(id);
    if (!target) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    // Prevent changing developer role
    if (target.role === "developer" && body.role && body.role !== "developer") {
      return NextResponse.json(
        { error: "Tidak dapat mengubah role akun developer" },
        { status: 403 },
      );
    }

    // Prevent assigning developer role to others
    if (body.role === "developer" && target.role !== "developer") {
      return NextResponse.json(
        { error: "Tidak dapat menjadikan user lain sebagai developer" },
        { status: 403 },
      );
    }

    const allowed = ["name", "nip", "jabatan", "unitKerja", "email", "noTelp", "role", "isBlocked"];
    const update = {};

    for (const key of allowed) {
      if (key in body) update[key] = body[key];
    }

    // If password is provided, hash it
    if (body.password && body.password.length >= 8) {
      update.password = await bcrypt.hash(body.password, 10);
    }

    const updated = await UpgAdmin.findByIdAndUpdate(id, update, { new: true })
      .select("-password")
      .lean();

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/auth/users/[id] — delete user (developer only)
export async function DELETE(req, { params }) {
  const caller = getCallerRole(req);

  if (!caller || caller.role !== "developer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    await connect();
    const { id } = await params;

    const target = await UpgAdmin.findById(id);
    if (!target) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    // Cannot delete the developer account
    if (target.role === "developer") {
      return NextResponse.json(
        { error: "Tidak dapat menghapus akun developer" },
        { status: 403 },
      );
    }

    await UpgAdmin.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
