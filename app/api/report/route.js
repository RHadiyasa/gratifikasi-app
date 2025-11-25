import { NextResponse } from "next/server";
import { connect } from "@/config/dbconfig";
import Report from "@/modules/models/ReportModel";
import ReportModel from "@/modules/models/ReportModel";

export async function POST(req) {
  try {
    await connect();
    const body = await req.json();
    console.log(body)

    // save report
    const report = await Report.create(body);

    return NextResponse.json(
      { message: "Laporan berhasil dibuat", data: report },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST ERROR", error);
    return NextResponse.json(
      {
        message: "Gagal Menyimpan Laporan",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  await connect();

  try {
    const response = await ReportModel.find().sort({ createdAt: -1 }); 
    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}