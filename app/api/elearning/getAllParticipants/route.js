import { NextResponse } from "next/server";
import { connect } from "@/config/dbconfig";
import ElearningParticipant from "@/modules/models/ParticipantModel";
import ElearningSettings from "@/modules/models/ElearningSettingsModel";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

const PUBLIC_FIELDS = "_id nama unit_eselon_i batch tahun statusCourse";

export async function GET() {
  try {
    const session = await getSessionUser();
    const isPrivileged = hasPermission(session?.role, "elearning:participants");

    await connect();

    if (!isPrivileged) {
      const settings = await ElearningSettings.findOne({ key: "global" }).lean();
      const tahunAktif = settings?.tahunAktif ?? null;
      const batchAktif = settings?.batchAktif?.toString().trim() || null;

      if (!tahunAktif || !batchAktif) {
        return NextResponse.json({
          success: true,
          count: 0,
          scope: "public",
          activeCohort: null,
          data: [],
        });
      }

      const participants = await ElearningParticipant.find({
        tahun: tahunAktif,
        batch: batchAktif,
        statusCourse: { $ne: "Belum" },
      })
        .select(PUBLIC_FIELDS)
        .lean();

      return NextResponse.json({
        success: true,
        count: participants.length,
        scope: "public",
        activeCohort: { tahun: tahunAktif, batch: batchAktif },
        data: participants,
      });
    }

    const participants = await ElearningParticipant.find({}).lean();
    return NextResponse.json({
      success: true,
      count: participants.length,
      scope: "full",
      data: participants,
    });
  } catch (error) {
    console.error("Error fetching participants:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil data peserta dari server.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
