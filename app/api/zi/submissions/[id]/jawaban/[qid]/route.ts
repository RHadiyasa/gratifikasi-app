import { NextResponse } from "next/server";
import { connect } from "@/config/dbconfig";
import LkeJawaban from "@/modules/models/LkeJawaban";
import LkeSubmission from "@/modules/models/LkeSubmission";
import { getSessionUser } from "@/lib/auth";
import {
  canAccessZiSubmission,
  getEditableZiJawabanFields,
  hasPermission,
} from "@/lib/permissions";

function mapAllowedBody(
  body: Record<string, any>,
  allowedFields: string[],
) {
  const update: Record<string, any> = {};
  for (const field of allowedFields) {
    if (field === "ai_result.supervisi") continue;
    if (field in body) update[field] = body[field];
  }
  if (
    allowedFields.includes("ai_result.supervisi") &&
    body.supervisi !== undefined
  ) {
    update["ai_result.supervisi"] = body.supervisi;
  }
  return update;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; qid: string }> },
) {
  try {
    const user = await getSessionUser({ includeProfile: true });
    if (!user || !hasPermission(user.role, "zi:access")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connect();
    const { id, qid } = await params;
    const questionId = parseInt(qid);
    if (Number.isNaN(questionId)) {
      return NextResponse.json(
        { error: "question_id tidak valid" },
        { status: 400 },
      );
    }

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

    const body = await req.json();
    const allowedFields = getEditableZiJawabanFields(user.role);
    const update = mapAllowedBody(body, allowedFields);

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: "Tidak ada field yang boleh diubah oleh role ini" },
        { status: 403 },
      );
    }

    const doc = await LkeJawaban.findOneAndUpdate(
      { submission_id: id, question_id: questionId },
      {
        $set: update,
        $setOnInsert: { submission_id: id, question_id: questionId },
      },
      { new: true, upsert: true },
    ).lean();

    return NextResponse.json({ jawaban: doc });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
