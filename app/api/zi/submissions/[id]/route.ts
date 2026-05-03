import { NextResponse } from "next/server";
import { connect } from "@/config/dbconfig";
import LkeSubmission from "@/modules/models/LkeSubmission";
import UpgAdmin from "@/modules/models/UpgAdminModel";
import { getSessionUser } from "@/lib/auth";
import { canAccessZiSubmission, hasPermission } from "@/lib/permissions";

async function getAccessibleSubmission(id: string) {
  const user = await getSessionUser({ includeProfile: true });
  if (!user || !hasPermission(user.role, "zi:access")) {
    return { user: null, submission: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 403 }) };
  }

  await connect();
  const submission = (await LkeSubmission.findById(id).lean()) as {
    eselon2?: string | null;
    assigned_unit_zi_id?: string | null;
  } | null;
  if (!submission) {
    return { user, submission: null, response: NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 }) };
  }
  if (!canAccessZiSubmission(user.role, user.unitKerja, submission, user.id)) {
    return { user, submission: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 403 }) };
  }

  return { user, submission, response: null };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const access = await getAccessibleSubmission(id);
    if (access.response) return access.response;
    let submission = access.submission as Record<string, any>;

    if (submission?.assigned_unit_zi_id) {
      const assignedUser = await UpgAdmin.findById(submission.assigned_unit_zi_id)
        .select("name")
        .lean<{ name?: string | null } | null>();
      submission = {
        ...submission,
        assigned_unit_zi_id: String(submission.assigned_unit_zi_id),
        assigned_unit_zi_name: assignedUser?.name ?? null,
      };
    }

    return NextResponse.json({ submission });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const access = await getAccessibleSubmission(id);
    if (access.response) return access.response;
    if (!hasPermission(access.user?.role, "zi:manage")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    if ("assigned_unit_zi_id" in body && !hasPermission(access.user?.role, "zi:assign-unit")) {
      return NextResponse.json(
        { error: "Role ini tidak memiliki izin assign Unit ZI" },
        { status: 403 },
      );
    }

    const allowed = [
      "status",
      "catatan",
      "pic_unit",
      "eselon2",
      "target",
      "assigned_unit_zi_id",
      "total_data",
      "checked_count",
      "unchecked_count",
      "progress_percent",
      "last_checked_at",
    ];
    const update: Record<string, any> = {};
    for (const key of allowed) {
      if (key in body) update[key] = body[key];
    }

    if (update.target && !["WBK", "WBBM"].includes(update.target)) {
      return NextResponse.json(
        { error: "Target harus WBK atau WBBM" },
        { status: 400 },
      );
    }
    if ("assigned_unit_zi_id" in update) {
      if (!update.assigned_unit_zi_id) {
        update.assigned_unit_zi_id = null;
      } else {
        const assignedUser = await UpgAdmin.findById(update.assigned_unit_zi_id)
          .select("role")
          .lean<{ role?: string | null } | null>();

        if (!assignedUser || assignedUser.role !== "unit_zi") {
          return NextResponse.json(
            { error: "Akun yang dipilih harus memiliki role Unit ZI" },
            { status: 400 },
          );
        }
      }
    }
    if ("checked_count" in update && "total_data" in update) {
      update.progress_percent =
        update.total_data > 0
          ? Math.round((update.checked_count / update.total_data) * 100)
          : 0;
    }

    const submission = await LkeSubmission.findByIdAndUpdate(id, update, {
      new: true,
    }).lean();
    return NextResponse.json({ submission });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const access = await getAccessibleSubmission(id);
    if (access.response) return access.response;
    if (!hasPermission(access.user?.role, "zi:delete")) {
      return NextResponse.json(
        { error: "Hanya role pengelola ZI yang dapat menghapus" },
        { status: 403 },
      );
    }

    await LkeSubmission.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
