import { NextResponse } from 'next/server';
import { connect } from "@/config/dbconfig";
import ElearningParticipant from "@/modules/models/ParticipantModel";

export async function GET() {
  try {
    await connect();

    const participants = await ElearningParticipant.find({});

    // Menggunakan NextResponse untuk respons JSON
    return NextResponse.json({
      success: true,
      count: participants.length,
      data: participants,
    }, { status: 200 }); // Tentukan status code di objek kedua

  } catch (error) {
    console.error("Error fetching participants:", error);
    
    // Menggunakan NextResponse untuk respons error
    return NextResponse.json({
      success: false,
      message: "Gagal mengambil data peserta dari server.",
      error: error.message,
    }, { status: 500 });
  }
}