import { NextRequest, NextResponse } from "next/server";
import { connect } from "@/config/dbconfig";
import ElearningParticipant from "@/modules/models/ParticipantModel";
import ElearningSettings from "@/modules/models/ElearningSettingsModel";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { ensureCohortBackfill } from "@/lib/elearning/cohort-migration";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!hasPermission(session?.role, "dashboard:elearning")) {
      return NextResponse.json(
        { success: false, message: "Tidak punya akses ke dashboard e-learning." },
        { status: 403 }
      );
    }

    await connect();
    await ensureCohortBackfill();

    const { searchParams } = new URL(req.url);
    const tahunParam = searchParams.get("tahun");
    const batchParam = searchParams.get("batch");

    const cohortFilter: Record<string, unknown> = {};
    if (tahunParam && tahunParam !== "all") {
      const parsed = parseInt(tahunParam, 10);
      if (!isNaN(parsed)) cohortFilter.tahun = parsed;
    }
    if (batchParam && batchParam !== "all") {
      cohortFilter.batch = batchParam;
    }

    const [
      totalCount,
      sudahCount,
      diverifikasiCount,
      unitAgg,
      uploadsAgg,
      recentUploads,
      settings,
    ] = await Promise.all([
      ElearningParticipant.countDocuments({ ...cohortFilter }),
      ElearningParticipant.countDocuments({ ...cohortFilter, statusCourse: "Sudah" }),
      ElearningParticipant.countDocuments({ ...cohortFilter, statusCourse: "Diverifikasi" }),
      ElearningParticipant.aggregate([
        { $match: { ...cohortFilter } },
        {
          $group: {
            _id: "$unit_eselon_i",
            total: { $sum: 1 },
            sudah: {
              $sum: {
                $cond: [
                  { $in: ["$statusCourse", ["Sudah", "Diverifikasi"]] },
                  1,
                  0,
                ],
              },
            },
            diverifikasi: {
              $sum: { $cond: [{ $eq: ["$statusCourse", "Diverifikasi"] }, 1, 0] },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      ElearningParticipant.aggregate([
        {
          $match: {
            ...cohortFilter,
            uploaded_at: { $ne: null },
            statusCourse: { $in: ["Sudah", "Diverifikasi"] },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$uploaded_at" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 30 },
      ]),
      ElearningParticipant.find({
        ...cohortFilter,
        statusCourse: { $in: ["Sudah", "Diverifikasi"] },
        uploaded_at: { $ne: null },
      })
        .sort({ uploaded_at: -1 })
        .limit(8)
        .select("_id nama unit_eselon_i statusCourse uploaded_at batch tahun")
        .lean(),
      ElearningSettings.findOne({ key: "global" }).lean(),
    ]);

    const totalSudahAtauDiverifikasi = sudahCount + diverifikasiCount;
    const completionRate =
      totalCount > 0
        ? Math.round((totalSudahAtauDiverifikasi / totalCount) * 100)
        : 0;

    const deadline = settings && (settings as any).deadlineUpload;
    let daysRemaining: number | null = null;
    if (deadline) {
      const diff = new Date(deadline).getTime() - Date.now();
      daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    const unitSummary = unitAgg.map((u) => ({
      unit: u._id ?? "(Tanpa Unit)",
      total: u.total,
      sudah: u.sudah,
      diverifikasi: u.diverifikasi,
      pct: u.total > 0 ? Math.round((u.sudah / u.total) * 100) : 0,
    }));

    const sortedByPct = [...unitSummary].sort((a, b) => b.pct - a.pct);

    return NextResponse.json({
      success: true,
      data: {
        cohort: {
          tahun: cohortFilter.tahun ?? null,
          batch: cohortFilter.batch ?? null,
        },
        totals: {
          total: totalCount,
          sudah: sudahCount,
          diverifikasi: diverifikasiCount,
          belum: totalCount - sudahCount - diverifikasiCount,
          completionRate,
        },
        deadline: deadline ? new Date(deadline).toISOString() : null,
        daysRemaining,
        uploadEnabled: settings ? (settings as any).uploadEnabled : true,
        tahunAktif: settings ? (settings as any).tahunAktif : null,
        batchAktif: settings ? (settings as any).batchAktif : "",
        unitSummary,
        topUnits: sortedByPct.slice(0, 5),
        bottomUnits: sortedByPct
          .filter((u) => u.pct < 100)
          .slice(-5)
          .reverse(),
        uploadsTimeline: uploadsAgg.map((u) => ({
          date: u._id,
          count: u.count,
        })),
        recentUploads,
      },
    });
  } catch (error: any) {
    console.error("Error elearning dashboard-stats:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data dashboard.", error: error?.message },
      { status: 500 }
    );
  }
}
