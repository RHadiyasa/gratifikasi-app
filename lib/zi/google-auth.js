import { google } from "googleapis";
import fs from "fs";

export function getGoogleAuth() {
  let credentials;
  if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    credentials = {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  } else if (
    process.env.GOOGLE_CREDENTIALS_FILE &&
    fs.existsSync(process.env.GOOGLE_CREDENTIALS_FILE)
  ) {
    credentials = JSON.parse(
      fs.readFileSync(process.env.GOOGLE_CREDENTIALS_FILE, "utf8"),
    );
  } else {
    throw new Error(
      "Google credentials tidak ditemukan. Set GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY, atau GOOGLE_CREDENTIALS_FILE",
    );
  }
  return new google.auth.GoogleAuth({
    credentials,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.readonly",
    ],
  });
}

/**
 * Klien OAuth akun user untuk operasi OCR.
 *
 * Kenapa bukan service account: service account tidak punya kuota penyimpanan
 * Drive, sehingga pembuatan Google Doc sementara (langkah wajib OCR) selalu
 * gagal "storage quota exceeded". File temp dibuat atas nama akun user
 * (scope drive.file — hanya file buatan aplikasi ini) lalu langsung dihapus.
 *
 * Return null jika env belum dikonfigurasi — pemanggil menangani sendiri.
 */
export function getOcrOAuthClient() {
  const {
    GOOGLE_OAUTH_CLIENT_ID,
    GOOGLE_OAUTH_CLIENT_SECRET,
    GOOGLE_OAUTH_REFRESH_TOKEN,
  } = process.env;
  if (!GOOGLE_OAUTH_CLIENT_ID || !GOOGLE_OAUTH_CLIENT_SECRET || !GOOGLE_OAUTH_REFRESH_TOKEN) {
    return null;
  }
  const client = new google.auth.OAuth2(GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET);
  client.setCredentials({ refresh_token: GOOGLE_OAUTH_REFRESH_TOKEN });
  return client;
}
