import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const updateSessionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: updateSessionMock,
}));

import { middleware } from "../../../middleware";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://twentytwoparts.com");
  vi.stubEnv("NEXT_PUBLIC_VENDOR_APP_URL", "https://vendors.twentytwoparts.com");
});

afterEach(() => {
  updateSessionMock.mockReset();
  vi.unstubAllEnvs();
});

function request(path = "/") {
  return new NextRequest("https://vendors.twentytwoparts.com" + path, {
    headers: { host: "vendors.twentytwoparts.com" },
  });
}

function session(
  principal: {
    role: "ADMIN" | "BUYER" | "SELLER";
    status: "ACTIVE" | "RESTRICTED" | "SUSPENDED";
  } | null,
) {
  updateSessionMock.mockResolvedValue({
    principal,
    response: NextResponse.next(),
    userId: principal ? "user-id" : null,
  });
}

describe("vendor hostname middleware", () => {
  it("rewrites a signed-out vendor login without rendering marketplace navigation", async () => {
    const nextRequest = request("/login");
    session(null);
    const response = await middleware(nextRequest);
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "https://vendors.twentytwoparts.com/vendor-login",
    );
  });

  it("routes authoritative roles away from the wrong application shell", async () => {
    const sellerRequest = request("/");
    session({ role: "SELLER", status: "ACTIVE" });
    const sellerResponse = await middleware(sellerRequest);
    expect(sellerResponse.headers.get("x-middleware-rewrite")).toBe(
      "https://vendors.twentytwoparts.com/seller/dashboard",
    );

    const buyerRequest = request("/");
    session({ role: "BUYER", status: "ACTIVE" });
    const buyerResponse = await middleware(buyerRequest);
    expect(buyerResponse.headers.get("location")).toBe(
      "https://twentytwoparts.com/marketplace",
    );

    const adminRequest = request("/");
    session({ role: "ADMIN", status: "ACTIVE" });
    const adminResponse = await middleware(adminRequest);
    expect(adminResponse.headers.get("location")).toBe(
      "https://twentytwoparts.com/admin",
    );
  });

  it("keeps signed-out vendor access on the vendor login hostname", async () => {
    const nextRequest = request("/products");
    session(null);
    const response = await middleware(nextRequest);
    expect(response.headers.get("location")).toBe(
      "https://vendors.twentytwoparts.com/login?next=%2Fseller%2Fproducts",
    );
  });
});
