import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SellerSignupWizardFields } from "@/components/auth/seller-signup-wizard-fields";
import { initialAuthActionState } from "@/lib/auth/types";

describe("seller signup form", () => {
  it("shows the compact seller signup on one page", () => {
    render(
      <form>
        <SellerSignupWizardFields state={initialAuthActionState} />
      </form>,
    );

    expect(screen.getByLabelText("Full name")).toBeVisible();
    expect(screen.getByLabelText("Store or business name")).toBeVisible();
    expect(screen.getByLabelText("Email")).toBeVisible();
    expect(screen.getByLabelText("Create a password")).toBeVisible();
    expect(screen.getByLabelText("Confirm password")).toBeVisible();
    expect(screen.getByRole("button", { name: "Create seller account" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Continue" })).not.toBeInTheDocument();
  });
});
