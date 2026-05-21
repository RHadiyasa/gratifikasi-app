import { NextRequest, NextResponse } from "next/server";
import { connect } from "@/config/dbconfig";
import ElearningParticipant from "@/modules/models/ParticipantModel";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/elearning/participants/[id]
 * Body: { nama, nip, jabatan, unit_eselon_i, unit_eselon_ii }
 *
 * Update data identitas peserta (pergantian peserta mendadak).
 * Tidak mengubah status, s3_key, batch, tahun, dll.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionUser({ includeProfile: true });
    if (!hasPermission(session?.role, "elearning:participants:manage")) {
      return NextResponse.json(
        { success: false, message: "Anda tidak punya akses untuk mengubah data peserta." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const { nama, nip, jabatan, unit_eselon_i, unit_eselon_ii } = body;

    if (!nama?.trim() || !nip?.trim()) {
      return NextResponse.json(
        { success: false, message: "Nama dan NIP wajib diisi." },
        { status: 400 }
      );
    }

    await connect();

    const peserta = await ElearningParticipant.findById(id);
    if (!peserta) {
      return NextResponse.json(
        { success: false, message: "Peserta tidak ditemukan." },
        { status: 404 }
      );
    }

    // Cek duplikat NIP jika NIP diubah
    const nipTrimmed = nip.trim();
    if (nipTrimmed !== peserta.nip) {
      const existing = await ElearningParticipant.findOne({
        nip: nipTrimmed,
        _id: { $ne: id },
      });
      if (existing) {
        return NextResponse.json(
          {
            success: false,
            message: `NIP ${nipTrimmed} sudah terdaftar atas nama ${existing.nama}.`,
          },
          { status: 409 }
        );
      }
    }

    peserta.nama = nama.trim();
    peserta.nip = nipTrimmed;
    if (jabatan !== undefined) peserta.jabatan = jabatan?.trim() ?? "";
    if (unit_eselon_i !== undefined) peserta.unit_eselon_i = unit_eselon_i?.trim() ?? "";
    if (unit_eselon_ii !== undefined) peserta.unit_eselon_ii = unit_eselon_ii?.trim() ?? "";

    await peserta.save();

    return NextResponse.json({
      success: true,
      message: "Data peserta berhasil diperbarui.",
      data: {
        _id: peserta._id,
        nama: peserta.nama,
        nip: peserta.nip,
        jabatan: peserta.jabatan,
        unit_eselon_i: peserta.unit_eselon_i,
        unit_eselon_ii: peserta.unit_eselon_ii,
      },
    });
  } catch (error: any) {
    console.error("Gagal update peserta:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memperbarui data peserta.", error: error?.message },
      { status: 500 }
    );
  }
}
