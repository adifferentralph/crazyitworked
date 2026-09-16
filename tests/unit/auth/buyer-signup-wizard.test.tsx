import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BuyerSignupWizardFields } from "@/components/auth/buyer-signup-wizard-fields";
import { initialAuthActionState } from "@/lib/auth/types";

describe("buyer signup wizard", () => {
  it("moves through four steps and preserves entered values when navigating back", () => {
    render(
      <form>
        <BuyerSignupWizardFields state={initialAuthActionState} />
      </form>,
    );

    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Raphael" } });
    fireEvent.change(screen.getByLabelText("Last name"), { target: { value: "Driver" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("Step 2 of 4")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "raphael@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("Step 3 of 4")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "strong-password" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "strong-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("Step 4 of 4")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create buyer account" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByLabelText("First name")).toHaveValue("Raphael");
    expect(screen.getByLabelText("Last name")).toHaveValue("Driver");
  });

  it("does not advance while required name fields are empty", () => {
    render(
      <form>
        <BuyerSignupWizardFields state={initialAuthActionState} />
      </form>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
  });
});