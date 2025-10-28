import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ 
    success: true,
    message: 'Logout Berhasil'
  });

  // 1. Instruksikan browser untuk menghapus cookie 'token'
  // Caranya adalah dengan mengatur properti yang SAMA seperti saat login,
  // tetapi atur 'maxAge' atau 'expires' ke nilai masa lalu (0 atau negatif).
  response.cookies.set('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0, // <-- Kunci: Mengatur maxAge ke 0 akan menghapus cookie segera
  });

  return response;
}