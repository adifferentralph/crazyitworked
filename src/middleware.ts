import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getAppUrl, getVendorAppUrl } from "@/config/env";
import {
  getVendorAccessDestination,
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

function createLoginUrl(returnTo: string, sessionExpired: boolean, origin = getAppUrl()) {
  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set("next", returnTo);
  if (sessionExpired) loginUrl.searchParams.set("message", "session-expired");
  return loginUrl;
}

export async function middleware(request: NextRequest) {
  const originalHadAuthCookie = hasAuthCookie(request);
  const { principal, response, userId } = await updateSession(request);
  const hostname = normalizeRequestHostname(request.headers.get("host"));
  const marketplaceOrigin = getAppUrl();
  const vendorOrigin = getVendorAppUrl();
  const pathname = request.nextUrl.pathname;

  if (isVendorHostname(hostname, vendorOrigin)) {
    if (isVendorPassthroughPath(pathname)) return response;

    if (pathname === "/signup/seller") {
      return copyResponseCookies(
        response,
        NextResponse.redirect(new URL("/signup", vendorOrigin)),
      );
    }

    if (pathname === "/signup") {
      if (!userId) {
        const signupUrl = request.nextUrl.clone();
        signupUrl.pathname = "/vendor-signup";
        const rewritten = NextResponse.rewrite(signupUrl);
        return copyResponseCookies(response, rewritten);
      }

      const destination = getVendorAccessDestination(principal?.role, principal?.status);
      if (destination === "SELLER") {
        return copyResponseCookies(
          response,
          NextResponse.redirect(new URL("/dashboard", vendorOrigin)),
        );
      }
      if (destination === "ADMIN") {
        return copyResponseCookies(
          response,
          NextResponse.redirect(new URL("/admin", marketplaceOrigin)),
        );
      }
      if (destination === "MARKETPLACE") {
        return copyResponseCookies(
          response,
          NextResponse.redirect(new URL("/marketplace", marketplaceOrigin)),
        );
      }
      return copyResponseCookies(
        response,
        NextResponse.redirect(new URL("/account-restricted", marketplaceOrigin)),
      );
    }

    if (pathname === "/login") {
      if (!userId) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = "/vendor-login";
        const rewritten = NextResponse.rewrite(loginUrl);
        return copyResponseCookies(response, rewritten);
      }

      const destination = getVendorAccessDestination(principal?.role, principal?.status);
      if (destination === "SELLER") {
        return copyResponseCookies(
          response,
          NextResponse.redirect(new URL("/dashboard", vendorOrigin)),
        );
      }
      if (destination === "ADMIN") {
        return copyResponseCookies(
          response,
          NextResponse.redirect(new URL("/admin", marketplaceOrigin)),
        );
      }
      if (destination === "MARKETPLACE") {
        return copyResponseCookies(
          response,
          NextResponse.redirect(new URL("/marketplace", marketplaceOrigin)),
        );
      }
      return copyResponseCookies(
        response,
        NextResponse.redirect(new URL("/account-restricted", marketplaceOrigin)),
      );
    }

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
        NextResponse.redirect(createLoginUrl(returnTo, originalHadAuthCookie, vendorOrigin)),
      );
    }

    const destination = getVendorAccessDestination(principal?.role, principal?.status);
    if (destination === "ADMIN") {
      return copyResponseCookies(
        response,
        NextResponse.redirect(new URL("/admin", marketplaceOrigin)),
      );
    }
    if (destination === "MARKETPLACE") {
      return copyResponseCookies(
        response,
        NextResponse.redirect(new URL("/marketplace", marketplaceOrigin)),
      );
    }
    if (destination === "RESTRICTED") {
      return copyResponseCookies(
        response,
        NextResponse.redirect(new URL("/account-restricted", marketplaceOrigin)),
      );
    }

    const internalUrl = request.nextUrl.clone();
    internalUrl.pathname = internalPath;
    const rewritten = NextResponse.rewrite(internalUrl);
    return copyResponseCookies(response, rewritten);
  }

  if (isMarketplaceHostname(hostname, marketplaceOrigin) && pathname === "/vendor-signup") {
    return copyResponseCookies(
      response,
      NextResponse.redirect(new URL("/signup", vendorOrigin)),
    );
  }

  if (isMarketplaceHostname(hostname, marketplaceOrigin) && pathname === "/vendor-login") {
    return copyResponseCookies(
      response,
      NextResponse.redirect(new URL("/login", marketplaceOrigin)),
    );
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
