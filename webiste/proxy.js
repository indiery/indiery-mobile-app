import { NextResponse } from "next/server";

const ADMIN_SESSION_COOKIE = "indiery_admin_session";

export function proxy(request) {
  const path = request.nextUrl.pathname;
  if (path === "/admin/login" || path === "/admin/accept-invite") return NextResponse.next();

  if (!request.cookies.get(ADMIN_SESSION_COOKIE)?.value) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", `${path}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
