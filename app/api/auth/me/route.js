import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connect } from "@/config/dbconfig";
import UpgAdmin from "@/modules/models/UpgAdminModel";

export async function GET(req) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ success: false });

    const payload = jwt.verify(token, process.env.TOKEN_SECRET);
    let profile = null;

    if (payload.id) {
      await connect();
      profile = await UpgAdmin.findById(payload.id)
        .select("name unitKerja")
        .lean();
    }

    return NextResponse.json({
      success: true,
      role: payload.role ?? null,
      id: payload.id ?? null,
      name: profile?.name ?? null,
      unitKerja: profile?.unitKerja ?? null,
      nip: payload.nip,
    });
  } catch {
    return NextResponse.json({ success: false });
  }
}
