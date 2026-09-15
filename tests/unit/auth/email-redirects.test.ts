import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

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
      "emailRedirectTo: `${getAppUrl()}/auth/callback?next=${encodeURIComponent(getHomeForRole(role))}`",
    );
    expect(site).toContain('url: "https://twentytwoparts.com"');
  });

  it("declares cache-busted PNG and ICO favicons in the root metadata", () => {
    expect(layout).toContain('url: "/favicon.ico?v=20260907"');
    expect(layout).toContain('url: "/icon.png?v=20260907"');
    expect(layout).toContain('shortcut: "/favicon.ico?v=20260907"');
  });
});
