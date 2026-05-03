import { NextResponse } from "next/server";
import {
  getDashboardHref,
  hasPermission,
  isPrivilegedRole,
} from "@/lib/permissions";

function decodeJwtPayload(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function redirectToRoleHome(request, role) {
  return NextResponse.redirect(new URL(getDashboardHref(role), request.url));
}

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token")?.value;
  const payload = token ? decodeJwtPayload(token) : null;
  const role = payload?.role ?? null;

  if (pathname === "/login") {
    if (payload) return redirectToRoleHome(request, role);
    return NextResponse.next();
  }

  if (!payload) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname === "/dashboard" || pathname === "/dashboard/") {
    if (!hasPermission(role, "dashboard:admin")) {
      return redirectToRoleHome(request, role);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/dashboard/accounts")) {
    if (role !== "developer") {
      return redirectToRoleHome(request, role);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/dashboard/upg")) {
    if (!hasPermission(role, "dashboard:gratifikasi")) {
      return redirectToRoleHome(request, role);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/dashboard/zi/kriteria")) {
    if (!hasPermission(role, "zi:kriteria:manage")) {
      return redirectToRoleHome(request, role);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/dashboard/zi")) {
    if (!hasPermission(role, "dashboard:zi")) {
      return redirectToRoleHome(request, role);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/dashboard/report-list")) {
    if (!hasPermission(role, "report:list")) {
      return redirectToRoleHome(request, role);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/register")) {
    if (!hasPermission(role, "register:access")) {
      return redirectToRoleHome(request, role);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/e-learning/tracker")) {
    if (!hasPermission(role, "elearning:track")) {
      if (hasPermission(role, "elearning:participants")) {
        return NextResponse.redirect(
          new URL("/e-learning/participants", request.url),
        );
      }
      return redirectToRoleHome(request, role);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/zona-integritas/lke-checker")) {
    if (!hasPermission(role, "zi:access")) {
      if (isPrivilegedRole(role) || hasPermission(role, "zi:monitoring")) {
        return NextResponse.redirect(
          new URL("/zona-integritas/monitoring", request.url),
        );
      }
      return redirectToRoleHome(request, role);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/profile")) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/register",
    "/login",
    "/profile",
    "/profile/:path*",
    "/e-learning/tracker",
    "/e-learning/tracker/:path*",
    "/zona-integritas/lke-checker",
    "/zona-integritas/lke-checker/:path*",
  ],
};
