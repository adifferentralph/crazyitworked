import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeSelector } from "@/components/theme/theme-selector";

describe("theme selector", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark");
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => ({
        addEventListener: vi.fn(),
        matches: false,
        media: "(prefers-color-scheme: dark)",
        removeEventListener: vi.fn(),
      })),
    });
  });

  it("offers system, light and dark and persists the chosen theme", async () => {
    render(<ThemeSelector />);
    const selector = screen.getByRole("combobox", { name: "Colour theme" });

    expect(screen.getByRole("option", { name: "System" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Light" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Dark" })).toBeInTheDocument();

    fireEvent.change(selector, { target: { value: "dark" } });
    await waitFor(() => expect(document.documentElement).toHaveClass("dark"));
    expect(window.localStorage.getItem("twenty-two-parts-theme")).toBe("dark");
  });
});
