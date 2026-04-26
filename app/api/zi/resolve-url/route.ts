import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getGoogleAuth } from "@/lib/zi/google-auth";

function extractSheetId(url: string): string {
  const m = url.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : url.trim();
}

function colToLetter(col: number): string {
  let letter = "";
  while (col > 0) {
    const rem = (col - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    col = Math.floor((col - 1) / 26);
  }
  return letter;
}

const LINK_COL = 14; // COL.LINK

export async function POST(req: Request) {
  try {
    const { shortUrl, sheetUrl, sheetName, rowId } = await req.json();

    if (!shortUrl || !sheetUrl || !rowId) {
      return NextResponse.json(
        { error: "shortUrl, sheetUrl, dan rowId wajib diisi" },
        { status: 400 },
      );
    }

    // ── Resolve URL dengan follow redirect ──
    let resolvedUrl: string;
    try {
      const res = await fetch(shortUrl, {
        method: "HEAD",
        redirect: "follow",
        signal: AbortSignal.timeout(10_000),
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      resolvedUrl = res.url;
    } catch {
      // Fallback ke GET jika HEAD diblokir
      try {
        const res = await fetch(shortUrl, {
          method: "GET",
          redirect: "follow",
          signal: AbortSignal.timeout(10_000),
          headers: { "User-Agent": "Mozilla/5.0" },
        });
        resolvedUrl = res.url;
      } catch (err: any) {
        return NextResponse.json(
          { error: `Gagal resolve URL: ${err.message}` },
          { status: 400 },
        );
      }
    }

    if (!resolvedUrl.includes("drive.google.com")) {
      return NextResponse.json(
        { error: `URL bukan Google Drive: ${resolvedUrl}` },
        { status: 400 },
      );
    }

    // ── Temukan baris di sheet berdasarkan ID ──
    const spreadsheetId = extractSheetId(sheetUrl);
    const tabName       = sheetName?.trim() || "Jawaban";
    const auth          = getGoogleAuth();
    const client        = await auth.getClient();
    const sheets        = google.sheets({ version: "v4", auth: client });

    const readRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${tabName}!A:A`,
    });
    const colA   = readRes.data.values || [];
    const rowNum = colA.findIndex((r) => String(r[0] || "").trim() === String(rowId));

    if (rowNum < 0) {
      return NextResponse.json(
        { error: `ID ${rowId} tidak ditemukan di sheet` },
        { status: 404 },
      );
    }

    // ── Update cell ──
    const colLetter = colToLetter(LINK_COL);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tabName}!${colLetter}${rowNum + 1}`,
      valueInputOption: "RAW",
      requestBody: { values: [[resolvedUrl]] },
    });

    return NextResponse.json({ resolvedUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
