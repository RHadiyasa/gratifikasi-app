import { NextResponse } from "next/server";

function decodeJwtPayload(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

/** Roles with admin-level dashboard access */
function isPrivileged(role) {
  return role === "developer" || role === "admin";
}

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token")?.value;

  const publicRoutes = ["/login"];

  const payload = token ? decodeJwtPayload(token) : null;

  // 🔓 PUBLIC ROUTE
  if (publicRoutes.includes(pathname)) {
    if (payload) {
      const role = payload.role;

      const dest = isPrivileged(role)
        ? "/dashboard"
        : role === "zi"
          ? "/dashboard/zi"
          : "/dashboard/upg";

      return NextResponse.redirect(new URL(dest, request.url));
    }

    return NextResponse.next();
  }

  // 🔒 PROTECTED ROUTE
  if (!payload) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const role = payload.role;

  // /dashboard
  if (pathname === "/dashboard" || pathname === "/dashboard/") {
    if (isPrivileged(role)) return NextResponse.next();

    const dest =
      role === "zi" ? "/dashboard/zi" : "/dashboard/upg";

    return NextResponse.redirect(new URL(dest, request.url));
  }

  // /dashboard/accounts — developer only
  if (pathname.startsWith("/dashboard/accounts")) {
    if (role !== "developer") {
      const dest = isPrivileged(role)
        ? "/dashboard"
        : role === "zi"
          ? "/dashboard/zi"
          : "/dashboard/upg";

      return NextResponse.redirect(new URL(dest, request.url));
    }
  }

  // access control
  if (pathname.startsWith("/dashboard/upg")) {
    if (role === "zi") {
      return NextResponse.redirect(new URL("/dashboard/zi", request.url));
    }
  }

  if (pathname.startsWith("/dashboard/zi")) {
    if (role === "upg") {
      return NextResponse.redirect(new URL("/dashboard/upg", request.url));
    }
  }

  if (pathname.startsWith("/dashboard/report-list")) {
    if (role === "zi") {
      return NextResponse.redirect(new URL("/dashboard/zi", request.url));
    }
  }

  if (pathname.startsWith("/register")) {
    if (!isPrivileged(role)) {
      const dest =
        role === "zi" ? "/dashboard/zi" : "/dashboard/upg";

      return NextResponse.redirect(new URL(dest, request.url));
    }
  }

  // Tracker e-learning hanya untuk admin/developer dan upg
  if (pathname.startsWith("/e-learning/tracker")) {
    if (role === "zi") {
      return NextResponse.redirect(new URL("/e-learning/participants", request.url));
    }
  }

  // LKE Checker hanya untuk admin/developer dan zi
  if (pathname.startsWith("/zona-integritas/lke-checker")) {
    if (role === "upg") {
      return NextResponse.redirect(new URL("/zona-integritas/monitoring", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/register",
    "/login",
    "/e-learning/tracker",
    "/e-learning/tracker/:path*",
    "/zona-integritas/lke-checker",
    "/zona-integritas/lke-checker/:path*",
  ],
};
