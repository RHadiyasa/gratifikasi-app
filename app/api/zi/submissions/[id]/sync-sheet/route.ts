import { NextResponse } from "next/server";
import { connect } from "@/config/dbconfig";
import LkeSubmission from "@/modules/models/LkeSubmission";
import {
  SheetSyncValidationError,
  syncSheetToLkeJawaban,
  type SheetSyncMode,
} from "@/lib/zi/sheet-sync";
import { getSessionUser } from "@/lib/auth";
import { canAccessZiSubmission, hasPermission } from "@/lib/permissions";

function normalizeMode(value: unknown): SheetSyncMode {
  return value === "overwrite" ? "overwrite" : "missing_only";
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser({ includeProfile: true });
  if (!user || !hasPermission(user.role, "zi:sync")) {
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

    const body = await req.json().catch(() => ({}));
    const mode = normalizeMode(body?.mode);
    const sheetName =
      typeof body?.sheetName === "string" ? body.sheetName : undefined;

    await LkeSubmission.findByIdAndUpdate(id, {
      sync_status: "syncing",
      sync_error: null,
    });
    const sync = await syncSheetToLkeJawaban(id, { mode, sheetName });

    return NextResponse.json({ sync });
  } catch (err: any) {
    const message = err?.message ?? "Gagal sync Google Sheet";
    await LkeSubmission.findByIdAndUpdate(id, {
      sync_status: "error",
      sync_error: message,
    });

    if (err instanceof SheetSyncValidationError) {
      return NextResponse.json(
        { error: message, sync: err.result },
        { status: 422 },
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
