import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CategoryChips } from "@/components/marketplace/category-chips";

describe("category chips", () => {
  it("renders a live total and reachable category links", () => {
    render(
      <CategoryChips
        categories={[
          { id: "engine", label: "Engine", slug: "engine" },
          { id: "brakes", label: "Brakes", slug: "brakes" },
        ]}
        totalCount={128}
      />,
    );

    expect(
      screen.getByRole("link", { name: "View all 128 active categories" }),
    ).toHaveTextContent("All categories (128)");
    expect(screen.getByRole("link", { name: "Engine" })).toHaveAttribute(
      "href",
      "/categories/engine",
    );
    expect(
      screen.getByRole("link", { name: "Open the complete category directory" }),
    ).toHaveAttribute("href", "/categories");
  });
});
