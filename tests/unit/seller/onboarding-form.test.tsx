import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/(protected)/seller/actions", () => ({
  completeSellerOnboardingAction: vi.fn(),
}));

import { OnboardingForm } from "@/components/seller/onboarding-form";

const categories = [
  { id: "11111111-1111-4111-8111-111111111111", label: "Brakes" },
  { id: "22222222-2222-4222-8222-222222222222", label: "Engine" },
  { id: "33333333-3333-4333-8333-333333333333", label: "Electrical" },
];

const defaults = {
  businessRegistrationNumber: null,
  categoryIds: [],
  city: null,
  contactPhone: null,
  description: null,
  state: null,
  storeName: "Example Parts",
  websiteUrl: null,
};

describe("seller onboarding category selection", () => {
  it("selects, clears, and reports an indeterminate Select All state", () => {
    const { container } = render(<OnboardingForm categories={categories} defaults={defaults} />);
    const selectAll = screen.getByLabelText("Select all categories") as HTMLInputElement;
    const brake = screen.getByLabelText("Brakes") as HTMLInputElement;
    const engine = screen.getByLabelText("Engine") as HTMLInputElement;
    const electrical = screen.getByLabelText("Electrical") as HTMLInputElement;

    fireEvent.click(selectAll);
    expect([brake.checked, engine.checked, electrical.checked]).toEqual([true, true, true]);
    expect(selectAll.checked).toBe(true);

    fireEvent.click(engine);
    expect(selectAll.checked).toBe(false);
    expect(selectAll.indeterminate).toBe(true);

    fireEvent.click(engine);
    expect(selectAll.checked).toBe(true);
    expect(selectAll.indeterminate).toBe(false);
    expect(new FormData(container.querySelector("form")!).getAll("categoryIds")).toHaveLength(3);

    fireEvent.click(selectAll);
    expect([brake.checked, engine.checked, electrical.checked]).toEqual([false, false, false]);
    expect(new FormData(container.querySelector("form")!).getAll("categoryIds")).toEqual([]);
  });

  it("reaches Finish with optional store details empty", () => {
    render(<OnboardingForm categories={categories} defaults={defaults} />);

    fireEvent.change(screen.getByLabelText("Business phone"), {
      target: { value: "+234 801 234 5678" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("Step 2 of 5")).toBeInTheDocument();

    expect(screen.getByLabelText("Business Registration Number")).toHaveValue("");
    expect(screen.getByLabelText("Website")).toHaveValue("");
    expect(screen.getByLabelText("About your business")).toHaveValue("");
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("Step 3 of 5")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Brakes"));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("Step 4 of 5")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("State"), { target: { value: "Lagos" } });
    fireEvent.change(screen.getByLabelText("City"), { target: { value: "Ikeja" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByText("Step 5 of 5")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save store profile" })).toBeInTheDocument();
  });
  it("loads persisted category selections", () => {
    render(
      <OnboardingForm
        categories={categories}
        defaults={{ ...defaults, categoryIds: categories.map(({ id }) => id) }}
      />,
    );

    expect(screen.getByLabelText("Select all categories")).toBeChecked();
  });
});
