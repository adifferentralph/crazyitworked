import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { getPostAuthDestination } from "@/lib/auth/authorization";

const actions = readFileSync(resolve(process.cwd(), "src/app/(auth)/actions.ts"), "utf8");
const callback = readFileSync(resolve(process.cwd(), "src/app/auth/callback/route.ts"), "utf8");
const layout = readFileSync(resolve(process.cwd(), "src/app/layout.tsx"), "utf8");
const site = readFileSync(resolve(process.cwd(), "src/config/site.ts"), "utf8");

describe("authentication email redirects and global favicon", () => {
  it("returns password recovery through the code-exchange callback", () => {
    expect(actions).toContain("redirectTo: `${getAppUrl()}/auth/callback?next=/reset-password`");
    expect(callback).toContain("supabase.auth.exchangeCodeForSession(code)");
    expect(callback).toContain("getPostAuthDestination(profile.role, next)");
  });

  it("sets an explicit role-aware signup confirmation callback", () => {
    expect(actions).toContain(
      'const destination = getPostAuthDestination(role, formData.get("next"));',
    );
    expect(actions).toContain(
      "emailRedirectTo: `${getAppUrl()}/auth/callback?next=${encodeURIComponent(destination)}`",
    );

    const intendedBuyerPath = "/parts/brake-pad?fit=toyota camry";
    const buyerDestination = getPostAuthDestination("BUYER", intendedBuyerPath);
    const callbackUrl = new URL(
      `/auth/callback?next=${encodeURIComponent(buyerDestination)}`,
      "https://twentytwoparts.com",
    );

    expect(callbackUrl.pathname).toBe("/auth/callback");
    expect(callbackUrl.searchParams.get("next")).toBe(intendedBuyerPath);
    expect(callbackUrl.toString()).toContain(encodeURIComponent(intendedBuyerPath));
    expect(getPostAuthDestination("BUYER", null)).toBe("/marketplace");
    expect(getPostAuthDestination("BUYER", "/seller/dashboard")).toBe("/marketplace");
    expect(getPostAuthDestination("SELLER", null)).toBe("/seller/dashboard");
    expect(getPostAuthDestination("SELLER", "/seller/products/new")).toBe(
      "/seller/products/new",
    );
    expect(actions).toContain('return signup(formData, "BUYER");');
    expect(actions).toContain('return signup(formData, "SELLER");');
    expect(site).toContain('url: "https://twentytwoparts.com"');
  });

  it("declares cache-busted PNG and ICO favicons in the root metadata", () => {
    expect(layout).toContain('url: "/favicon.ico?v=20260907"');
    expect(layout).toContain('url: "/icon.png?v=20260907"');
    expect(layout).toContain('shortcut: "/favicon.ico?v=20260907"');
  });
});