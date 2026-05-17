import { NextRequest, NextResponse } from "next/server";
import { connect } from "@/config/dbconfig";
import ElearningSettings, {
  DEFAULT_ELEARNING_SETTINGS,
} from "@/modules/models/ElearningSettingsModel";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

async function getOrCreateSettings() {
  let doc = await ElearningSettings.findOne({ key: "global" });
  if (!doc) {
    doc = await ElearningSettings.create(DEFAULT_ELEARNING_SETTINGS);
  }
  return doc;
}

export async function GET() {
  try {
    await connect();
    const doc = await getOrCreateSettings();
    return NextResponse.json({
      success: true,
      data: {
        uploadEnabled: doc.uploadEnabled,
        uploadDisabledMessage: doc.uploadDisabledMessage,
        tahunAktif: doc.tahunAktif,
        batchAktif: doc.batchAktif,
        deadlineUpload: doc.deadlineUpload,
        adminContact: doc.adminContact,
        updatedAt: doc.updatedAt,
        updatedBy: doc.updatedBy,
      },
    });
  } catch (error) {
    console.error("Gagal mengambil elearning settings:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil pengaturan." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSessionUser({ includeProfile: true });
    if (!session || !hasPermission(session.role, "elearning:settings:manage")) {
      return NextResponse.json(
        { success: false, message: "Anda tidak punya akses untuk mengubah pengaturan ini." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const update: Record<string, unknown> = {};

    if (typeof body.uploadEnabled === "boolean") {
      update.uploadEnabled = body.uploadEnabled;
    }
    if (typeof body.uploadDisabledMessage === "string") {
      update.uploadDisabledMessage = body.uploadDisabledMessage.slice(0, 500);
    }
    if (typeof body.batchAktif === "string") {
      update.batchAktif = body.batchAktif.slice(0, 100);
    }
    if (typeof body.adminContact === "string") {
      update.adminContact = body.adminContact.slice(0, 500);
    }
    if (body.tahunAktif === null) {
      update.tahunAktif = null;
    } else if (
      typeof body.tahunAktif === "number" &&
      body.tahunAktif >= 2020 &&
      body.tahunAktif <= 2100
    ) {
      update.tahunAktif = Math.floor(body.tahunAktif);
    } else if (typeof body.tahunAktif === "string" && body.tahunAktif.trim()) {
      const parsed = parseInt(body.tahunAktif, 10);
      if (!isNaN(parsed) && parsed >= 2020 && parsed <= 2100) {
        update.tahunAktif = parsed;
      }
    }
    if (body.deadlineUpload === null) {
      update.deadlineUpload = null;
    } else if (typeof body.deadlineUpload === "string") {
      const parsed = new Date(body.deadlineUpload);
      if (!isNaN(parsed.getTime())) {
        update.deadlineUpload = parsed;
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { success: false, message: "Tidak ada field yang valid untuk diupdate." },
        { status: 400 }
      );
    }

    update.updatedBy = session.name || session.nip || session.id || "unknown";

    await connect();
    const doc = await ElearningSettings.findOneAndUpdate(
      { key: "global" },
      { $set: update },
      { new: true, upsert: true }
    );

    return NextResponse.json({
      success: true,
      message: "Pengaturan berhasil disimpan.",
      data: {
        uploadEnabled: doc.uploadEnabled,
        uploadDisabledMessage: doc.uploadDisabledMessage,
        tahunAktif: doc.tahunAktif,
        batchAktif: doc.batchAktif,
        deadlineUpload: doc.deadlineUpload,
        adminContact: doc.adminContact,
        updatedAt: doc.updatedAt,
        updatedBy: doc.updatedBy,
      },
    });
  } catch (error) {
    console.error("Gagal update elearning settings:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menyimpan pengaturan." },
      { status: 500 }
    );
  }
}
