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
