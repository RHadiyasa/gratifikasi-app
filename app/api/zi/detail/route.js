import { google } from "googleapis";
import fs from "fs";

function getGoogleAuth() {
  let credentials;
  if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    credentials = {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  } else if (process.env.GOOGLE_CREDENTIALS_FILE && fs.existsSync(process.env.GOOGLE_CREDENTIALS_FILE)) {
    credentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_CREDENTIALS_FILE, "utf8"));
  } else {
    throw new Error("Google credentials tidak ditemukan.");
  }
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

function extractSheetId(urlOrId) {
  const m = urlOrId.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : urlOrId.trim();
}

function detectDataStart(rows) {
  for (let i = 0; i < rows.length - 1; i++) {
    const id     = String(rows[i][0]     || "").trim();
    const idNext = String(rows[i + 1][0] || "").trim();
    if (/^\d+$/.test(id) && parseInt(id) <= 9999 &&
        /^\d+$/.test(idNext) && parseInt(idNext) <= 9999) return i;
  }
  for (let i = 0; i < rows.length; i++) {
    const id = String(rows[i][0] || "").trim();
    if (/^\d+$/.test(id) && parseInt(id) <= 9999) return i;
  }
  return 0;
}

const AI_PATTERN = /^[✅⚠️❌]/u;
const VR_SHEET   = "Visa review";

// COL = kolom di sheet LKE utama
const COL = { ID: 1, BUKTI: 13, LINK: 14 };

// VR_COL = kolom di sheet Visa review
const VR_COL = { ID: 1, RESULT: 5, REVIU: 6, SUPERVISI: 7, TGL_CEK: 8 };

export async function POST(req) {
  try {
    const { sheetUrl, sheetName } = await req.json();
    if (!sheetUrl?.trim()) {
      return Response.json({ error: "URL sheet wajib diisi" }, { status: 400 });
    }

    const spreadsheetId = extractSheetId(sheetUrl);
    const tabName       = sheetName?.trim() || "Jawaban";

    const auth       = getGoogleAuth();
    const authClient = await auth.getClient();
    const sheets     = google.sheets({ version: "v4", auth: authClient });

    // ── Baca sheet utama ──
    let mainRows = [];
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${tabName}!A:N`,
      });
      mainRows = res.data.values || [];
    } catch (err) {
      if (err.message?.includes("Unable to parse range")) {
        return Response.json({ error: `Tab "${tabName}" tidak ditemukan` }, { status: 404 });
      }
      throw err;
    }

    const dataStart  = detectDataStart(mainRows);
    const seenIds = new Set();
    const allDataRows = mainRows.slice(dataStart).filter((row) => {
      const id = String(row[COL.ID - 1] || "").trim();
      if (!/^\d+$/.test(id) || parseInt(id) > 9999) return false;
      if (seenIds.has(id)) return false;
      seenIds.add(id);
      return true;
    });

    // ── Baca Visa review ──
    const vrMap = {};
    try {
      const vrRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${VR_SHEET}!A:H`,
      });
      const vrRows = vrRes.data.values || [];
      for (let i = 1; i < vrRows.length; i++) {
        const id = String(vrRows[i][VR_COL.ID - 1] || "").trim();
        if (!id) continue;
        vrMap[id] = {
          result:    String(vrRows[i][VR_COL.RESULT    - 1] || "").trim(),
          reviu:     String(vrRows[i][VR_COL.REVIU     - 1] || "").trim(),
          supervisi: String(vrRows[i][VR_COL.SUPERVISI - 1] || "").trim(),
          tglCek:    String(vrRows[i][VR_COL.TGL_CEK   - 1] || "").trim(),
        };
      }
    } catch {
      // Visa review belum ada
    }

    // ── Susun per-row data ──
    const rows = allDataRows.map((row) => {
      const id    = String(row[COL.ID   - 1] || "").trim();
      const bukti = String(row[COL.BUKTI - 1] || "").trim();
      const link  = String(row[COL.LINK  - 1] || "").trim();
      const hasLink = link.includes("drive.google");

      const vr = vrMap[id];
      const isChecked  = vr && AI_PATTERN.test(vr.result);
      const isRevisi   = vr?.supervisi === "Revisi";

      let status;
      if (!hasLink)       status = "no_link";
      else if (isRevisi)  status = "revisi";
      else if (isChecked) status = "checked";
      else                status = "unchecked";

      const verdictColor = isChecked
        ? /^✅/u.test(vr.result) ? "HIJAU"
        : /^⚠️/u.test(vr.result) ? "KUNING"
        : "MERAH"
        : null;

      return {
        id,
        bukti,
        link:    hasLink ? link : null,
        rawLink: link || null,
        status,
        verdict:     isChecked ? vr.result    : null,
        verdictColor,
        reviu:       isChecked ? vr.reviu     : null,
        supervisi:   vr?.supervisi            ?? null,
        tglCek:      isChecked ? vr.tglCek    : null,
      };
    });

    const total     = rows.length;
    const checked   = rows.filter((r) => r.status === "checked").length;
    const unchecked = rows.filter((r) => r.status === "unchecked").length;
    const noLink    = rows.filter((r) => r.status === "no_link").length;
    const revisi    = rows.filter((r) => r.status === "revisi").length;

    return Response.json({ rows, summary: { total, checked, unchecked, noLink, revisi } });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
