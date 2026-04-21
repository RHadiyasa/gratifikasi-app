import { connect } from "@/config/dbconfig";
import UpgAdmin from "@/modules/models/UpgAdminModel";
import { NextResponse } from "next/server";
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

// GET /api/auth/users — list all users (developer only)
export async function GET(req) {
  const callerRole = getCallerRole(req);

  if (callerRole !== "developer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    await connect();

    const users = await UpgAdmin.find({}, "-password").sort({ createdAt: -1 }).lean();

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
