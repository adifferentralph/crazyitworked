import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TrustRating } from "@/components/marketplace/trust-rating";

describe("TrustRating", () => {
  it("labels the score as marketplace trust rather than customer reviews", () => {
    render(<TrustRating score={3.5} />);
    expect(screen.getByLabelText(/3.5 out of 5 marketplace trust score/i)).toBeInTheDocument();
    expect(screen.getByText("3.5")).toBeInTheDocument();
  });
});
