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
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB,
    });

    isConnected = true;
    console.log("MongoDB berhasil terkoneksi!");

    mongoose.connection.on("error", (err) => {
      isConnected = false;
      console.log("Koneksi MongoDB terputus: " + err);
    });
  } catch (error) {
    console.log("Sesuatu salah di dbConfig:", error);
    throw error;
  }
}
