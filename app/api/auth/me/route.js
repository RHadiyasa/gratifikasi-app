import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function GET(req) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ success: false });

    jwt.verify(token, process.env.TOKEN_SECRET);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false });
  }
}
