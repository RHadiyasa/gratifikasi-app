// Ambil GOOGLE_OAUTH_REFRESH_TOKEN untuk fitur OCR LKE (dijalankan sekali saja).
//
// Cara pakai:
//   node scripts/get-google-oauth-token.mjs <CLIENT_ID> <CLIENT_SECRET>
//
// Buka URL yang tercetak di browser, login dengan akun Google yang akan
// "menampung" file temp OCR, setujui akses, lalu salin refresh token yang
// tercetak ke .env dan Vercel.
import http from "http";

import { google } from "googleapis";

const CLIENT_ID = process.argv[2];
const CLIENT_SECRET = process.argv[3];
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.log("Cara pakai: node scripts/get-google-oauth-token.mjs <CLIENT_ID> <CLIENT_SECRET>");
  process.exit(1);
}

const PORT = 53682;
const oauth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, `http://127.0.0.1:${PORT}`);

const url = oauth2.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  // drive.file: hanya file yang dibuat aplikasi ini — bukan seluruh Drive
  scope: ["https://www.googleapis.com/auth/drive.file"],
});

console.log("\n1. Buka URL berikut di browser dan login:\n");
console.log(url);
console.log("\n2. Setujui akses (jika muncul 'unverified app': Advanced → Go to ... (unsafe))");
console.log("3. Refresh token akan tercetak di terminal ini.\n");

http
  .createServer(async (req, res) => {
    const code = new URL(req.url, `http://127.0.0.1:${PORT}`).searchParams.get("code");
    if (!code) {
      res.end("Tidak ada authorization code.");
      return;
    }
    try {
      const { tokens } = await oauth2.getToken(code);
      res.end("Berhasil! Silakan kembali ke terminal.");
      console.log("Salin baris ini ke .env dan Vercel:\n");
      console.log(`GOOGLE_OAUTH_CLIENT_ID=${CLIENT_ID}`);
      console.log(`GOOGLE_OAUTH_CLIENT_SECRET=${CLIENT_SECRET}`);
      console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
    } catch (e) {
      res.end("Gagal menukar code: " + e.message);
      console.error("Gagal:", e.message);
    }
    process.exit(0);
  })
  .listen(PORT, () => {});
