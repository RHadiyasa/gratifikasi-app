import { NextResponse } from "next/server";
import { connect } from "@/config/dbconfig";
import ElearningParticipant from "@/modules/models/ParticipantModel";
import { ensureCohortBackfill } from "@/lib/elearning/cohort-migration";

/**
 * GET /api/elearning/cohorts
 *
 * Endpoint publik — return daftar tahun & batch yang ada di database
 * (untuk isi dropdown filter di dashboard, tracker, dan halaman peserta).
 *
 * Data yang di-return cuma agregasi count, tidak ada PII peserta —
 * aman untuk dipanggil dari halaman publik.
 */
export async function GET() {
  try {
    await connect();
    await ensureCohortBackfill();

    const agg = await ElearningParticipant.aggregate([
      {
        $match: {
          tahun: { $type: "number" },
          batch: { $type: "string", $nin: [null, ""] },
        },
      },
      {
        $group: {
          _id: { tahun: "$tahun", batch: "$batch" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.tahun": -1, "_id.batch": 1 } },
    ]);

    const byTahun: Record<string, Array<{ batch: string; count: number }>> = {};
    const tahunSet = new Set<number>();

    for (const row of agg) {
      const tahun: number = row._id.tahun;
      const batch: string = String(row._id.batch);
      tahunSet.add(tahun);
      if (!byTahun[tahun]) byTahun[tahun] = [];
      byTahun[tahun].push({ batch, count: row.count });
    }

    const tahunList = Array.from(tahunSet).sort((a, b) => b - a);

    return NextResponse.json({
      success: true,
      data: {
        tahun: tahunList,
        byTahun,
      },
    });
  } catch (error: any) {
    console.error("Error fetching cohorts:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil daftar cohort.", error: error?.message },
      { status: 500 }
    );
  }
}
