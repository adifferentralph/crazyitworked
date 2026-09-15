import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getAppUrl, getVendorAppUrl } from "@/config/env";
import {
  isMarketplaceHostname,
  isVendorHostname,
  isVendorPassthroughPath,
  normalizeRequestHostname,
  sellerPathToVendorPath,
  vendorPathToInternal,
} from "@/lib/routing/vendor";
import { updateSession } from "@/lib/supabase/middleware";

const protectedPrefixes = ["/account", "/admin", "/cart", "/seller"] as const;

function copyResponseCookies(source: NextResponse, destination: NextResponse) {
  source.cookies.getAll().forEach((cookie) => destination.cookies.set(cookie));
  return destination;
}

function hasAuthCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some(({ name }) => name.startsWith("sb-") && name.includes("auth-token"));
}

function createLoginUrl(returnTo: string, sessionExpired: boolean) {
  const loginUrl = new URL("/login", getAppUrl());
  loginUrl.searchParams.set("next", returnTo);
  if (sessionExpired) loginUrl.searchParams.set("message", "session-expired");
  return loginUrl;
}

export async function middleware(request: NextRequest) {
  const originalHadAuthCookie = hasAuthCookie(request);
  const { response, userId } = await updateSession(request);
  const hostname = normalizeRequestHostname(
    request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
  );
  const marketplaceOrigin = getAppUrl();
  const vendorOrigin = getVendorAppUrl();
  const pathname = request.nextUrl.pathname;

  if (isVendorHostname(hostname, vendorOrigin)) {
    if (isVendorPassthroughPath(pathname)) return response;

    if (pathname.startsWith("/seller")) {
      const vendorPath = sellerPathToVendorPath(pathname);
      if (vendorPath) {
        const canonicalUrl = new URL(`${vendorPath}${request.nextUrl.search}`, vendorOrigin);
        return copyResponseCookies(response, NextResponse.redirect(canonicalUrl));
      }
    }

    const internalPath = vendorPathToInternal(pathname);
    if (!internalPath) {
      const marketplaceUrl = new URL(`${pathname}${request.nextUrl.search}`, marketplaceOrigin);
      return copyResponseCookies(response, NextResponse.redirect(marketplaceUrl));
    }

    const returnTo = `${internalPath}${request.nextUrl.search}`;
    if (!userId) {
      return copyResponseCookies(
        response,
        NextResponse.redirect(createLoginUrl(returnTo, originalHadAuthCookie)),
      );
    }

    const internalUrl = request.nextUrl.clone();
    internalUrl.pathname = internalPath;
    const rewritten = NextResponse.rewrite(internalUrl, {
      request: { headers: request.headers },
    });
    return copyResponseCookies(response, rewritten);
  }

  if (isMarketplaceHostname(hostname, marketplaceOrigin) && pathname.startsWith("/seller")) {
    const vendorPath = sellerPathToVendorPath(pathname);
    if (vendorPath) {
      const vendorUrl = new URL(`${vendorPath}${request.nextUrl.search}`, vendorOrigin);
      return copyResponseCookies(response, NextResponse.redirect(vendorUrl));
    }
  }

  const returnTo = `${pathname}${request.nextUrl.search}`;
  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !userId) {
    return copyResponseCookies(
      response,
      NextResponse.redirect(createLoginUrl(returnTo, originalHadAuthCookie)),
    );
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
