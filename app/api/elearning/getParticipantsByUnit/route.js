import { NextResponse } from "next/server";
import { connect } from "@/config/dbconfig";
import ElearningParticipant from "@/modules/models/ParticipantModel";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export async function GET(request) {
  let unitName = "(unknown)";
  try {
    const session = await getSessionUser();
    if (!hasPermission(session?.role, "elearning:participants")) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Anda harus login dengan akun yang memiliki akses untuk mengakses data ini.",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    unitName = searchParams.get("unit") ?? "(unknown)";

    if (!unitName || unitName === "(unknown)") {
      return NextResponse.json(
        { success: false, message: "Parameter 'unit' diperlukan." },
        { status: 400 }
      );
    }

    await connect();

    const participants = await ElearningParticipant.find({
      unit_eselon_i: unitName,
      statusCourse: { $in: ["Sudah", "Diverifikasi"] },
      s3_key: { $exists: true, $ne: null },
    }).select("s3_key nama nip unit_eselon_i statusCourse");

    return NextResponse.json(
      {
        success: true,
        count: participants.length,
        data: participants,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`Error fetching participants by unit ${unitName}:`, error);
    return NextResponse.json(
      {
        success: false,
        message: `Gagal mengambil data peserta unit ${unitName} dari server.`,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
