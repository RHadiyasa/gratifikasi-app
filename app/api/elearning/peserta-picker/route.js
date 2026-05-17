import { NextResponse } from "next/server";
import { connect } from "@/config/dbconfig";
import ElearningParticipant from "@/modules/models/ParticipantModel";
import ElearningSettings from "@/modules/models/ElearningSettingsModel";

const PICKER_FIELDS = "_id nama nip unit_eselon_i statusCourse uploaded_at";

export async function GET() {
  try {
    await connect();

    const settings = await ElearningSettings.findOne({ key: "global" }).lean();

    const uploadEnabled = settings?.uploadEnabled !== false;
    const tahunAktif = settings?.tahunAktif ?? null;
    const batchAktif = settings?.batchAktif?.toString().trim() || null;
    const hasActiveCohort = Boolean(tahunAktif && batchAktif);

    let participants = [];
    if (uploadEnabled && hasActiveCohort) {
      participants = await ElearningParticipant.find({
        tahun: tahunAktif,
        batch: batchAktif,
      })
        .select(PICKER_FIELDS)
        .lean();
    }

    return NextResponse.json(
      {
        success: true,
        uploadEnabled,
        hasActiveCohort,
        cohort: { tahun: tahunAktif, batch: batchAktif },
        adminContact:
          settings?.adminContact ||
          "Hubungi Admin E-Learning Inspektorat V Itjen ESDM.",
        count: participants.length,
        data: participants,
        message: !uploadEnabled
          ? settings?.uploadDisabledMessage ||
            "Fitur upload sertifikat sedang tidak tersedia."
          : !hasActiveCohort
            ? "Cohort aktif belum ditetapkan oleh admin. Hubungi Admin E-Learning untuk mengaktifkan batch yang sedang berjalan."
            : null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching peserta picker:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil data peserta.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
