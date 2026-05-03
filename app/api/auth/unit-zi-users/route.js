import { NextResponse } from "next/server";
import { connect } from "@/config/dbconfig";
import UpgAdmin from "@/modules/models/UpgAdminModel";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export async function GET() {
  const session = await getSessionUser({ includeProfile: false });
  if (!session || !hasPermission(session.role, "zi:assign-unit")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    await connect();
    const users = await UpgAdmin.find(
      { role: "unit_zi", isBlocked: { $ne: true } },
      "name unitKerja email role",
    )
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({ success: true, users });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
