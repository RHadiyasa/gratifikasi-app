import { connect } from "@/config/dbconfig";
import ReportModel from "@/modules/models/ReportModel";

export async function GET(req, { params }) {
  await connect();
  const { id } = params;

  try {
    const data = await ReportModel.findById(id);
    if (!data)
      return Response.json({ message: "Tidak ditemukan" }, { status: 404 });

    return Response.json({ data });
  } catch (e) {
    return Response.json({ message: e.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  await connect();
  const { id } = params;
  const body = await req.json();

  try {
    const updated = await ReportModel.findByIdAndUpdate(id, body, {
      new: true,
    });

    return Response.json({ message: "Status diperbarui", data: updated });
  } catch (e) {
    return Response.json({ message: e.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  await connect();
  const { id } = params;

  try {
    await ReportModel.findByIdAndDelete(id);
    return Response.json({ message: "Berhasil dihapus" });
  } catch (e) {
    return Response.json({ message: e.message }, { status: 500 });
  }
}
