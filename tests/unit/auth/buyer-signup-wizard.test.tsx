import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BuyerSignupWizardFields } from "@/components/auth/buyer-signup-wizard-fields";
import { initialAuthActionState } from "@/lib/auth/types";

describe("buyer signup form", () => {
  it("shows every signup section on one page", () => {
    render(
      <form>
        <BuyerSignupWizardFields state={initialAuthActionState} />
      </form>,
    );

    expect(screen.getByLabelText("First name")).toBeVisible();
    expect(screen.getByLabelText("Last name")).toBeVisible();
    expect(screen.getByLabelText("Email")).toBeVisible();
    expect(screen.getByLabelText("Phone number — Optional")).toBeVisible();
    expect(screen.getByLabelText("Create a password")).toBeVisible();
    expect(screen.getByLabelText("Confirm password")).toBeVisible();
    expect(screen.getByRole("button", { name: "Create buyer account" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Continue" })).not.toBeInTheDocument();
  });

  it("keeps optional phone, organisation, and marketing fields optional", () => {
    render(
      <form>
        <BuyerSignupWizardFields state={initialAuthActionState} />
      </form>,
    );

    expect(screen.getByLabelText("Phone number — Optional")).not.toBeRequired();
    expect(screen.getByLabelText("Business or organisation name")).not.toBeRequired();
    expect(screen.getByText(/Email me product updates and offers/).closest("label")?.querySelector("input")).not.toBeRequired();
  });
});
