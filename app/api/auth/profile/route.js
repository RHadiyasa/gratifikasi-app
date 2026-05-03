import { NextResponse } from "next/server";
import { connect } from "@/config/dbconfig";
import UpgAdmin from "@/modules/models/UpgAdminModel";
import { getSessionUser } from "@/lib/auth";

const PROFILE_FIELDS = ["name", "nip", "jabatan", "unitKerja", "email", "noTelp"];

export async function GET() {
  const session = await getSessionUser({ includeProfile: false });
  if (!session?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    await connect();
    const user = await UpgAdmin.findById(session.id).select("-password").lean();

    if (!user) {
      return NextResponse.json(
        { error: "Akun tidak ditemukan" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  const session = await getSessionUser({ includeProfile: false });
  if (!session?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    await connect();
    const body = await req.json();
    const update = {};

    for (const key of PROFILE_FIELDS) {
      if (key in body) {
        update[key] = typeof body[key] === "string" ? body[key].trim() : body[key];
      }
    }

    const user = await UpgAdmin.findByIdAndUpdate(session.id, update, {
      new: true,
      runValidators: true,
    })
      .select("-password")
      .lean();

    if (!user) {
      return NextResponse.json(
        { error: "Akun tidak ditemukan" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    const message =
      error?.code === 11000
        ? "NIP atau email sudah digunakan akun lain"
        : error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
