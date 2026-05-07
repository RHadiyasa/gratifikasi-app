import { NextResponse } from "next/server";
import { connect } from "@/config/dbconfig";
import LkeSubmission from "@/modules/models/LkeSubmission";
import { getSessionUser } from "@/lib/auth";
import { canAccessZiSubmission, hasPermission } from "@/lib/permissions";
import { compareAppAnswersWithSheet } from "@/lib/zi/sheet-sync";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser({ includeProfile: true });
  if (!user || !hasPermission(user.role, "zi:access")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  await connect();
  const { id } = await params;

  try {
    const submission = (await LkeSubmission.findById(id)
      .select("eselon2 assigned_unit_zi_id")
      .lean()) as {
      eselon2?: string | null;
      assigned_unit_zi_id?: string | null;
    } | null;
    if (!submission) {
      return NextResponse.json(
        { error: "Submission tidak ditemukan" },
        { status: 404 },
      );
    }
    if (!canAccessZiSubmission(user.role, user.unitKerja, submission, user.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const sheetName = searchParams.get("sheetName") || undefined;
    const compare = await compareAppAnswersWithSheet(id, { sheetName });
    return NextResponse.json({ compare });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Gagal membandingkan Google Sheet" },
      { status: 500 },
    );
  }
}
