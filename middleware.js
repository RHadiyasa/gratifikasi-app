import { NextResponse } from "next/server";

export function middleware(request) {
  const token = request.cookies.get("token"); // ambil token dari cookie
  console.log("token: ", token);
  // Jika belum login → redirect ke halaman login
  if (!token && request.nextUrl.pathname.startsWith("/dashboard")) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Tentukan halaman mana saja yang ingin diamankan
export const config = {
  matcher: ["/dashboard/:path*"], // semua halaman di bawah /dashboard
};
