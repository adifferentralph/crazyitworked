import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SellerSignupWizardFields } from "@/components/auth/seller-signup-wizard-fields";
import { initialAuthActionState } from "@/lib/auth/types";

describe("seller signup wizard", () => {
  it("validates only the current step and reaches password setup", () => {
    render(
      <form>
        <SellerSignupWizardFields state={initialAuthActionState} />
      </form>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Full name"), {
      target: { value: "Tomi Seller" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("Step 2 of 4")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Store or business name"), {
      target: { value: "Tomi Auto Parts" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("Step 3 of 4")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "tomi@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByText("Step 4 of 4")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create seller account" })).toBeInTheDocument();
  });
});
