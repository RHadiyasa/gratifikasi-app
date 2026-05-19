import { NextResponse } from "next/server";
import { connect } from "@/config/dbconfig";
import ElearningParticipant from "@/modules/models/ParticipantModel";
import ElearningSettings from "@/modules/models/ElearningSettingsModel";

export async function GET() {
  try {
    await connect();

    const settings = await ElearningSettings.findOne({ key: "global" }).lean();
    const tahunAktif = settings?.tahunAktif ?? null;
    const batchAktif = settings?.batchAktif?.toString().trim() || null;

    if (!tahunAktif || !batchAktif) {
      return NextResponse.json({ success: true, activeCohort: null, units: [] });
    }

    const pipeline = [
      { $match: { tahun: tahunAktif, batch: batchAktif } },
      {
        $group: {
          _id: "$unit_eselon_i",
          total: { $sum: 1 },
          uploaded: {
            $sum: { $cond: [{ $ne: ["$statusCourse", "Belum"] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          unit: "$_id",
          total: 1,
          uploaded: 1,
          pct: {
            $cond: [
              { $gt: ["$total", 0] },
              {
                $round: [
                  { $multiply: [{ $divide: ["$uploaded", "$total"] }, 100] },
                  0,
                ],
              },
              0,
            ],
          },
        },
      },
      { $sort: { pct: -1, uploaded: -1, unit: 1 } },
    ];

    const units = await ElearningParticipant.aggregate(pipeline);

    return NextResponse.json({
      success: true,
      activeCohort: { tahun: tahunAktif, batch: batchAktif },
      units,
    });
  } catch (error) {
    console.error("Error fetching unit stats:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil statistik unit." },
      { status: 500 }
    );
  }
}
