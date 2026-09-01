export type MarketplaceNavigationKey =
  | "account"
  | "cart"
  | "categories"
  | "home"
  | "requests";

function isWithin(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function getMarketplaceNavigationKey(
  pathname: string,
): MarketplaceNavigationKey {
  if (isWithin(pathname, "/categories")) return "categories";
  if (
    isWithin(pathname, "/request-a-part") ||
    isWithin(pathname, "/account/requests")
  ) {
    return "requests";
  }
  if (isWithin(pathname, "/cart")) return "cart";
  if (isWithin(pathname, "/account")) return "account";
  return "home";
}
