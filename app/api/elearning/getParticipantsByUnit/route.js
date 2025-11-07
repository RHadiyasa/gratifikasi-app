import { NextResponse } from "next/server";
import { connect } from "@/config/dbconfig";
import ElearningParticipant from "@/modules/models/ParticipantModel";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const unitName = searchParams.get("unit");

    if (!unitName) {
      return NextResponse.json(
        { success: false, message: "Parameter 'unit' diperlukan." },
        { status: 400 }
      );
    }

    await connect();

    const participants = await ElearningParticipant.find({
      unit_eselon_i: unitName,
      statusCourse: "Sudah",
      s3_key: { $exists: true, $ne: null },
    }).select("s3_key nama nip unit_eselon_i");

    console.log(
      `[API] Ditemukan ${participants.length} peserta selesai untuk Unit: ${unitName}`
    );

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
