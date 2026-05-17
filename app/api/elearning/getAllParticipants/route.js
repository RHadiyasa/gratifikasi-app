import { NextResponse } from "next/server";
import { connect } from "@/config/dbconfig";
import ElearningParticipant from "@/modules/models/ParticipantModel";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

const PUBLIC_FIELDS = "_id nama unit_eselon_i batch statusCourse";

export async function GET() {
  try {
    const session = await getSessionUser();
    const isPrivileged = hasPermission(session?.role, "elearning:participants");

    await connect();

    const query = ElearningParticipant.find({});
    if (!isPrivileged) {
      query.select(PUBLIC_FIELDS);
    }

    const participants = await query.lean();

    return NextResponse.json(
      {
        success: true,
        count: participants.length,
        scope: isPrivileged ? "full" : "public",
        data: participants,
      },
      { status: 200 }
    );
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
