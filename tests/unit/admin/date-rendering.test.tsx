import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAdminCustomers, getAdminSellers } = vi.hoisted(() => ({
  getAdminCustomers: vi.fn(),
  getAdminSellers: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/sellers",
}));

vi.mock("@/lib/auth/principal", () => ({
  requireRole: vi.fn().mockResolvedValue({ id: "admin-id", role: "ADMIN", status: "ACTIVE" }),
}));

vi.mock("@/lib/admin/operations", () => ({
  getAdminCustomers,
  getAdminSellers,
}));

import AdminCustomersPage from "@/app/(protected)/admin/customers/page";
import AdminSellersPage from "@/app/(protected)/admin/sellers/page";

describe("admin date rendering", () => {
  beforeEach(() => {
    getAdminCustomers.mockReset();
    getAdminSellers.mockReset();
  });

  it.each([
    ["2026-09-17T10:30:00.000Z", /17\/09\/2026/],
    [null, /Incomplete/],
    ["not-a-date", /Incomplete/],
  ])("renders seller onboarding date %s without crashing", async (value, expected) => {
    getAdminSellers.mockResolvedValue([
      {
        city: "Ikeja",
        email: "seller@example.com",
        joinedAt: "2026-09-01T08:00:00.000Z",
        onboardingCompletedAt: value,
        productCount: 2,
        state: "Lagos",
        status: "ACTIVE",
        storeName: "Raven Express",
      },
    ]);

    render(await AdminSellersPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("Raven Express")).toBeVisible();
    expect(screen.getByText(expected)).toBeVisible();
  });

  it.each([
    ["2026-09-17T10:30:00.000Z", /17\/09\/2026/],
    [null, /^—$/],
    ["not-a-date", /^—$/],
  ])("renders customer joined date %s without crashing", async (value, expected) => {
    getAdminCustomers.mockResolvedValue([
      {
        accountStatus: "ACTIVE",
        accountType: "INDIVIDUAL",
        email: "buyer@example.com",
        fullName: "Test Buyer",
        joinedAt: value,
        lastOrderAt: null,
        marketingOptIn: false,
        orderCount: 0,
        phone: null,
        unsubscribedAt: null,
      },
    ]);

    render(await AdminCustomersPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("Test Buyer")).toBeVisible();
    expect(screen.getByText(expected)).toBeVisible();
    expect(screen.getByText("No orders")).toBeVisible();
  });
});
