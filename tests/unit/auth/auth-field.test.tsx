import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AuthField } from "@/components/auth/auth-field";

describe("AuthField password visibility", () => {
  it("keeps passwords masked until the user explicitly reveals them", () => {
    render(<AuthField label="Password" name="password" type="password" />);

    const input = screen.getByLabelText("Password");
    const toggle = screen.getByRole("button", { name: "Show password" });

    expect(input).toHaveAttribute("type", "password");
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(toggle);

    expect(input).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("can mask the password again without changing its value", () => {
    render(
      <AuthField
        defaultValue="secure-value"
        label="New password"
        name="password"
        type="password"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show new password" }));
    fireEvent.click(screen.getByRole("button", { name: "Hide new password" }));

    const input = screen.getByLabelText("New password");
    expect(input).toHaveAttribute("type", "password");
    expect(input).toHaveValue("secure-value");
  });
});