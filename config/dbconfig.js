// config/dbConfig.js
import mongoose from "mongoose";

// Lacak status koneksi
let isConnected = false;

export async function connect() {
  // 1. Jika sudah terkoneksi, jangan buat koneksi baru
  if (isConnected) {
    console.log("MongoDB sudah terkoneksi.");
    return;
  }

  try {
    // 2. Buat koneksi BARU
    // Tambahkan 'await' di sini!
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB, // Ambil nama DB dari .env
    });

    const connection = mongoose.connection;

    connection.on("connected", () => {
      isConnected = true; // Set status jadi true
      console.log("MongoDB berhasil terkoneksi!");
    });

    connection.on("error", (err) => {
      isConnected = false;
      console.log("Koneksi MongoDB gagal: " + err);
      process.exit();
    });
  } catch (error) {
    console.log("Sesuatu salah di dbConfig:", error);
  }
}
