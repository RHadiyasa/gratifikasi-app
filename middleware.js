import { NextResponse } from "next/server";

export function middleware(request) {
  const token = request.cookies.get("token"); 

  // Jika token tidak ada, redirect ke halaman login
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Tentukan halaman mana saja yang ingin diamankan secara spesifik
export const config = {
  matcher: [
    // Mengamankan semua halaman di bawah /dashboard
    "/dashboard/:path*",
    
    // Mengamankan halaman /e-learning/tracker dan semua halaman di bawahnya
    "/e-learning/tracker/:path*",
    
    // Jika Anda juga ingin mengamankan /e-learning/tracker itu sendiri (tanpa path), 
    // Anda bisa tambahkan: "/e-learning/tracker"
  ],
};