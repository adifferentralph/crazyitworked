import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

const protectedPrefixes = ["/account", "/admin", "/cart", "/seller"] as const;

function copyResponseCookies(
  source: NextResponse,
  destination: NextResponse,
) {
  source.cookies
    .getAll()
    .forEach((cookie) => destination.cookies.set(cookie));
  return destination;
}

export async function middleware(request: NextRequest) {
  const returnTo = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const { response, userId } = await updateSession(request);
  const isProtected = protectedPrefixes.some(
    (prefix) =>
      request.nextUrl.pathname === prefix ||
      request.nextUrl.pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !userId) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", returnTo);

    return copyResponseCookies(response, NextResponse.redirect(loginUrl));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
