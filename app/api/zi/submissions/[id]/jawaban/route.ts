import { NextResponse } from "next/server";
import { connect } from "@/config/dbconfig";
import LkeJawaban from "@/modules/models/LkeJawaban";
import LkeKriteria from "@/modules/models/LkeKriteria";
import LkeSubmission from "@/modules/models/LkeSubmission";
import {
  SheetSyncValidationError,
  syncSheetToLkeJawaban,
} from "@/lib/zi/sheet-sync";
import { getSessionUser } from "@/lib/auth";
import {
  canAccessZiSubmission,
  getEditableZiJawabanFields,
  hasPermission,
} from "@/lib/permissions";

function filterAllowedFields(
  allowedFields: string[],
  item: Record<string, any>,
) {
  const update: Record<string, any> = {};
  for (const field of allowedFields) {
    if (field in item) update[field] = item[field];
  }
  return update;
}

async function getAccessContext(id: string) {
  const user = await getSessionUser({ includeProfile: true });
  if (!user || !hasPermission(user.role, "zi:access")) {
    return {
      user: null,
      submission: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 403 }),
    };
  }

  await connect();
  const submission = (await LkeSubmission.findById(id)
    .select("source link eselon2 assigned_unit_zi_id")
    .lean()) as {
    source?: string | null;
    link?: string | null;
    eselon2?: string | null;
    assigned_unit_zi_id?: string | null;
  } | null;

  if (!submission) {
    return {
      user,
      submission: null,
      response: NextResponse.json(
        { error: "Submission tidak ditemukan" },
        { status: 404 },
      ),
    };
  }

  if (!canAccessZiSubmission(user.role, user.unitKerja, submission, user.id)) {
    return {
      user,
      submission: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 403 }),
    };
  }

  return { user, submission, response: null };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const access = await getAccessContext(id);
    if (access.response) return access.response;

    let sync = null;
    const detailQuestionIds = await LkeKriteria.distinct("question_id", {
      aktif: true,
      answer_type: "jumlah",
      parent_question_id: { $ne: null },
    });
    const hasDetailCriteria = detailQuestionIds.length > 0;
    const detailCriteriaCount = detailQuestionIds.length;
    const [
      jawabanCount,
      hasAnyUnitData,
      unitDetailAnswerCount,
      hasAnyTpiUnitData,
      tpiUnitDetailAnswerCount,
      hasAnyTpiItjenData,
      tpiItjenDetailAnswerCount,
    ] = await Promise.all([
      LkeJawaban.countDocuments({ submission_id: id }),
      LkeJawaban.exists({
        submission_id: id,
        $or: [
          { jawaban_unit: /\S/ },
          { narasi: /\S/ },
          { bukti: /\S/ },
          { link_drive: /\S/ },
        ],
      }),
      hasDetailCriteria
        ? LkeJawaban.countDocuments({
            submission_id: id,
            question_id: { $in: detailQuestionIds },
            jawaban_unit: /\S/,
          })
        : Promise.resolve(0),
      LkeJawaban.exists({
        submission_id: id,
        $or: [{ jawaban_tpi_unit: /\S/ }, { catatan_tpi_unit: /\S/ }],
      }),
      hasDetailCriteria
        ? LkeJawaban.countDocuments({
            submission_id: id,
            question_id: { $in: detailQuestionIds },
            jawaban_tpi_unit: /\S/,
          })
        : Promise.resolve(0),
      LkeJawaban.exists({
        submission_id: id,
        $or: [{ jawaban_tpi_itjen: /\S/ }, { catatan_tpi_itjen: /\S/ }],
      }),
      hasDetailCriteria
        ? LkeJawaban.countDocuments({
            submission_id: id,
            question_id: { $in: detailQuestionIds },
            jawaban_tpi_itjen: /\S/,
          })
        : Promise.resolve(0),
    ]);

    const isSheetSource = access.submission.source !== "app";
    const missingUnitDetailAnswers =
      hasDetailCriteria && unitDetailAnswerCount < detailCriteriaCount;
    const missingTpiUnitDetailAnswers =
      hasDetailCriteria && tpiUnitDetailAnswerCount < detailCriteriaCount;
    const missingTpiItjenDetailAnswers =
      hasDetailCriteria && tpiItjenDetailAnswerCount < detailCriteriaCount;

    if (
      isSheetSource &&
      access.submission.link &&
      (jawabanCount === 0 ||
        !hasAnyUnitData ||
        missingUnitDetailAnswers ||
        !hasAnyTpiUnitData ||
        missingTpiUnitDetailAnswers ||
        !hasAnyTpiItjenData ||
        missingTpiItjenDetailAnswers)
    ) {
      sync = await syncSheetToLkeJawaban(id, { mode: "missing_only" });
    }

    const [jawabanList, kriteriaList] = await Promise.all([
      LkeJawaban.find({ submission_id: id }).lean(),
      LkeKriteria.find({ aktif: true }).sort({ komponen: 1, urutan: 1 }).lean(),
    ]);

    const jawabanMap = new Map(jawabanList.map((j) => [j.question_id, j]));
    const grouped: Record<string, any[]> = {};
    const KOMPONEN_ORDER = [
      "mp",
      "tt",
      "sdm",
      "ak",
      "pw",
      "pp",
      "ipak",
      "capaian_kinerja",
      "prima",
    ];

    for (const komponen of KOMPONEN_ORDER) grouped[komponen] = [];
    for (const kriteria of kriteriaList) {
      const key = kriteria.komponen as string;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({
        kriteria,
        jawaban: jawabanMap.get(kriteria.question_id) ?? null,
      });
    }

    return NextResponse.json({ jawaban: jawabanList, grouped, sync });
  } catch (err: any) {
    if (err instanceof SheetSyncValidationError) {
      return NextResponse.json(
        { error: err.message, sync: err.result },
        { status: 422 },
      );
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const access = await getAccessContext(id);
    if (access.response) return access.response;

    const allowedFields = getEditableZiJawabanFields(access.user?.role);
    if (allowedFields.length === 0) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const items: { question_id: number; [key: string]: any }[] = body.jawaban ?? [];
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "jawaban harus berupa array dan tidak boleh kosong" },
        { status: 400 },
      );
    }

    const ops = [];
    for (const item of items) {
      const update = filterAllowedFields(allowedFields, item);
      if (Object.keys(update).length === 0) continue;

      ops.push({
        updateOne: {
          filter: { submission_id: id, question_id: item.question_id },
          update: {
            $set: update,
            $setOnInsert: { submission_id: id, question_id: item.question_id },
          },
          upsert: true,
        },
      });
    }

    if (ops.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada field yang boleh diubah oleh role ini" },
        { status: 403 },
      );
    }

    const result = await LkeJawaban.bulkWrite(ops);
    return NextResponse.json({
      upserted: result.upsertedCount,
      modified: result.modifiedCount,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
