import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function GET(req) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ success: false });

    const payload = jwt.verify(token, process.env.TOKEN_SECRET);
    return NextResponse.json({
      success: true,
      role: payload.role ?? "upg",
      nip: payload.nip,
    });
  } catch {
    return NextResponse.json({ success: false });
  }
}
