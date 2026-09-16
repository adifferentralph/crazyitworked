import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/principal", () => ({
  requireRole: vi.fn().mockResolvedValue({
    email: "raphael@example.com",
    fullName: "Raphael Doe",
    id: "f06be4c4-910a-4d6c-b9ca-86187bd91815",
    role: "BUYER",
    status: "ACTIVE",
  }),
}));

vi.mock("@/app/(auth)/actions", () => ({
  signOutAction: vi.fn(),
}));

import AccountPage from "@/app/(protected)/account/page";

describe("buyer account hub", () => {
  it("uses a stable letter avatar and exposes only real destinations", async () => {
    render(await AccountPage());

    expect(
      screen.getByRole("img", { name: "Raphael Doe account" }),
    ).toHaveTextContent("R");
    expect(screen.getByRole("link", { name: "Orders" })).toHaveAttribute(
      "href",
      "/account/orders",
    );
    expect(screen.getByRole("link", { name: /Settings/ })).toHaveAttribute(
      "href",
      "/account/settings",
    );
    expect(screen.queryByRole("link", { name: "Saved Sellers" })).toBeNull();
  });
});
