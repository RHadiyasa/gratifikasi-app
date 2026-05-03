import { NextResponse } from "next/server";
import { connect } from "@/config/dbconfig";
import LkeSubmission from "@/modules/models/LkeSubmission";
import { getSessionUser } from "@/lib/auth";
import { canAccessZiSubmission, hasPermission } from "@/lib/permissions";

export async function GET(req: Request) {
  const user = await getSessionUser({ includeProfile: true });
  if (!user || !hasPermission(user.role, "zi:access")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    await connect();

    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get("ids") || "";
    const ids = idsParam.split(",").filter(Boolean).slice(0, 4);

    if (ids.length === 0) {
      return NextResponse.json({ error: "Minimal 1 ID" }, { status: 400 });
    }

    const submissions = await LkeSubmission.find({ _id: { $in: ids } }).lean();
    const visible = submissions.filter((submission) =>
      canAccessZiSubmission(
        user.role,
        user.unitKerja,
        submission as {
          eselon2?: string | null;
          assigned_unit_zi_id?: string | null;
        },
        user.id,
      ),
    );

    return NextResponse.json({ submissions: visible });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
