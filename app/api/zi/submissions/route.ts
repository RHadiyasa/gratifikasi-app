import { NextResponse } from "next/server";
import { connect } from "@/config/dbconfig";
import LkeSubmission from "@/modules/models/LkeSubmission";
import LkeKriteria from "@/modules/models/LkeKriteria";
import UpgAdmin from "@/modules/models/UpgAdminModel";
import { getSessionUser } from "@/lib/auth";
import { canAccessZiSubmission, hasPermission } from "@/lib/permissions";
import { TARGET_THRESHOLD } from "@/types/zi";

function detectAbbrev(text: string): boolean {
  const words = text.split(/\s+/);
  return words.some(
    (w) =>
      (w.length > 1 && w === w.toUpperCase() && /^[A-Z]+$/.test(w)) ||
      /\.\w/.test(w),
  );
}

function extractSpreadsheetId(url: string | null | undefined): string | null {
  const value = String(url ?? "").trim();
  if (!value) return null;

  const match = value.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match?.[1]) return match[1];

  try {
    const parsed = new URL(value);
    const id = parsed.searchParams.get("id");
    return id ? id.trim() : null;
  } catch {
    return null;
  }
}

const PRIMARY_KRITERIA_QUERY = {
  aktif: true,
  $or: [{ answer_type: { $ne: "jumlah" } }, { parent_question_id: null }],
};

type SpreadsheetDuplicate = {
  _id: unknown;
  eselon2?: string | null;
  eselon1?: string | null;
  link?: string | null;
};

async function enrichAssignedUnitZi<T extends Record<string, any>>(submission: T) {
  if (!submission?.assigned_unit_zi_id) {
    return {
      ...submission,
      assigned_unit_zi_id: submission?.assigned_unit_zi_id ?? null,
      assigned_unit_zi_name: null,
    };
  }

  const assignedUser = await UpgAdmin.findById(submission.assigned_unit_zi_id)
    .select("name")
    .lean<{ name?: string | null } | null>();

  return {
    ...submission,
    assigned_unit_zi_id: String(submission.assigned_unit_zi_id),
    assigned_unit_zi_name: assignedUser?.name ?? null,
  };
}

async function findDuplicateSpreadsheet(spreadsheetId: string) {
  const byId = await LkeSubmission.findOne({
    source: "sheet",
    spreadsheet_id: spreadsheetId,
  })
    .select("_id eselon2 eselon1")
    .lean<SpreadsheetDuplicate | null>();

  if (byId) return byId;

  const existing = await LkeSubmission.find({
    source: "sheet",
    link: { $ne: null },
  })
    .select("_id eselon2 eselon1 link")
    .lean<SpreadsheetDuplicate[]>();

  return existing.find((item) => extractSpreadsheetId(item.link) === spreadsheetId) ?? null;
}

export async function GET(req: Request) {
  const user = await getSessionUser({ includeProfile: true });
  if (!user || !hasPermission(user.role, "zi:access")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    await connect();

    const { searchParams } = new URL(req.url);
    const eselon1 = searchParams.get("eselon1");
    const status = searchParams.get("status");
    const target = searchParams.get("target");
    const search = searchParams.get("search");

    const query: Record<string, any> = {};
    if (eselon1) query.eselon1 = eselon1;
    if (status) query.status = status;
    if (target) query.target = target;
    if (search) {
      query.$or = [
        { eselon2: { $regex: search, $options: "i" } },
        { pic_unit: { $regex: search, $options: "i" } },
      ];
    }

    const submissions = await LkeSubmission.find(query)
      .sort({ created_at: -1 })
      .lean();

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
    const enrichedVisible = await Promise.all(
      visible.map((submission) =>
        enrichAssignedUnitZi(submission as Record<string, any>),
      ),
    );

    const total = enrichedVisible.length;
    const selesai = enrichedVisible.filter((s) => s.status === "Selesai").length;
    const sedang = enrichedVisible.filter((s) => s.status === "Sedang Dicek").length;
    const belum = enrichedVisible.filter((s) => s.status === "Belum Dicek").length;
    const wbk_tercapai = enrichedVisible.filter(
      (s) =>
        s.target === "WBK" &&
        (s.nilai_lke_ai?.nilai_akhir ?? 0) >= TARGET_THRESHOLD.WBK,
    ).length;
    const wbbm_tercapai = enrichedVisible.filter(
      (s) =>
        s.target === "WBBM" &&
        (s.nilai_lke_ai?.nilai_akhir ?? 0) >= TARGET_THRESHOLD.WBBM,
    ).length;
    const withNilai = enrichedVisible.filter(
      (s) => s.nilai_lke_ai?.nilai_akhir != null,
    );
    const rata_nilai_akhir = withNilai.length
      ? withNilai.reduce(
          (sum, submission) => sum + (submission.nilai_lke_ai?.nilai_akhir ?? 0),
          0,
        ) / withNilai.length
      : null;

    return NextResponse.json({
      submissions: enrichedVisible,
      summary: {
        total,
        selesai,
        sedang,
        belum,
        wbk_tercapai,
        wbbm_tercapai,
        rata_nilai_akhir,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser({ includeProfile: true });
  if (!user || !hasPermission(user.role, "zi:manage")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    await connect();

    const body = await req.json();
    const { link, target, eselon1, eselon2, pic_unit, catatan, source } = body;
    const mode: "sheet" | "app" = source === "app" ? "app" : "sheet";
    const spreadsheetId = mode === "sheet" ? extractSpreadsheetId(link) : null;

    if (mode === "sheet" && !link?.includes("docs.google.com/spreadsheets")) {
      return NextResponse.json(
        { error: "Link harus berupa URL Google Sheets" },
        { status: 400 },
      );
    }
    if (mode === "sheet" && !spreadsheetId) {
      return NextResponse.json(
        { error: "ID Google Sheet tidak valid" },
        { status: 400 },
      );
    }
    if (!["WBK", "WBBM"].includes(target)) {
      return NextResponse.json(
        { error: "Target harus WBK atau WBBM" },
        { status: 400 },
      );
    }
    if (!eselon1 || !eselon2 || !pic_unit) {
      return NextResponse.json(
        { error: "Eselon I, Eselon II, dan PIC wajib diisi" },
        { status: 400 },
      );
    }

    if (spreadsheetId) {
      const duplicate = await findDuplicateSpreadsheet(spreadsheetId);
      if (duplicate) {
        return NextResponse.json(
          {
            error: `Google Sheet ini sudah terdaftar untuk ${duplicate.eselon2 ?? "unit lain"} (${duplicate.eselon1 ?? "-"})`,
          },
          { status: 409 },
        );
      }
    }

    const abbrev_warning = detectAbbrev(eselon2);

    const totalData =
      mode === "app"
        ? await LkeKriteria.countDocuments(PRIMARY_KRITERIA_QUERY)
        : 0;

    const submission = await LkeSubmission.create({
      link: mode === "sheet" ? link : null,
      spreadsheet_id: spreadsheetId,
      source: mode,
      target,
      eselon1,
      eselon2,
      pic_unit,
      catatan: catatan || "",
      total_data: mode === "app" ? totalData : 0,
      unchecked_count: mode === "app" ? totalData : 0,
    });

    const created = await LkeSubmission.findById(submission._id).lean();
    return NextResponse.json({ submission: created, abbrev_warning }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
