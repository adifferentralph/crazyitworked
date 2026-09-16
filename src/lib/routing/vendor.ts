const vendorRoutePrefixes = [
  "/dashboard",
  "/products",
  "/orders",
  "/requests",
  "/inventory",
  "/finance",
  "/reviews",
  "/notifications",
] as const;

const vendorPassthroughPaths = new Set(["/manifest.webmanifest", "/robots.txt", "/sw.js"]);

export type VendorAccessDestination = "ADMIN" | "MARKETPLACE" | "RESTRICTED" | "SELLER";

export function getVendorAccessDestination(
  role: "ADMIN" | "BUYER" | "SELLER" | undefined,
  status: "ACTIVE" | "RESTRICTED" | "SUSPENDED" | undefined,
): VendorAccessDestination {
  if (!role || status !== "ACTIVE") return "RESTRICTED";
  if (role === "ADMIN") return "ADMIN";
  if (role === "BUYER") return "MARKETPLACE";
  return "SELLER";
}

export function normalizeRequestHostname(value: string | null | undefined) {
  return value?.split(",", 1)[0]?.trim().split(":", 1)[0]?.toLowerCase() ?? "";
}

export function isVendorHostname(hostname: string, vendorOrigin: string) {
  return normalizeRequestHostname(hostname) === new URL(vendorOrigin).hostname.toLowerCase();
}

export function isMarketplaceHostname(hostname: string, marketplaceOrigin: string) {
  return normalizeRequestHostname(hostname) === new URL(marketplaceOrigin).hostname.toLowerCase();
}

export function vendorPathToInternal(pathname: string) {
  if (pathname === "/") return "/seller/dashboard";
  if (pathname === "/store" || pathname.startsWith("/store/")) return "/seller/onboarding";
  if (pathname === "/settings" || pathname.startsWith("/settings/")) {
    return "/seller/onboarding";
  }

  const prefix = vendorRoutePrefixes.find(
    (candidate) => pathname === candidate || pathname.startsWith(`${candidate}/`),
  );
  return prefix ? `/seller${pathname}` : null;
}

export function sellerPathToVendorPath(pathname: string) {
  if (pathname === "/seller" || pathname === "/seller/dashboard") return "/dashboard";
  if (pathname === "/seller/onboarding") return "/settings";
  return pathname.startsWith("/seller/") ? pathname.slice("/seller".length) : null;
}

export function isVendorPassthroughPath(pathname: string) {
  return vendorPassthroughPaths.has(pathname);
}
