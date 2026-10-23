import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/(protected)/commerce-actions", () => ({
  addToCartAction: async (
    previousState: { quantity: number },
    formData: FormData,
  ) => ({
    message: "Cart updated.",
    quantity:
      formData.get("operation") === "increment"
        ? previousState.quantity + 1
        : Number(formData.get("quantity")),
    status: "success" as const,
  }),
  removeCartItemAction: vi.fn(),
  updateCartItemAction: async (_previousState: unknown, formData: FormData) => ({
    message: "Quantity saved.",
    quantity: Number(formData.get("quantity")),
    status: "success" as const,
  }),
}));

import { AddToCartControl } from "@/components/commerce/add-to-cart-control";
import { CartContents } from "@/components/commerce/cart-contents";

describe("cart controls", () => {
  it("turns Add to cart into an inline quantity stepper", async () => {
    render(<AddToCartControl available={4} productId="11111111-1111-4111-8111-111111111111" />);

    fireEvent.click(screen.getByRole("button", { name: "Add to cart" }));

    expect(await screen.findByRole("button", { name: "Decrease quantity" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Increase quantity" })).toBeVisible();
    expect(screen.queryByRole("link", { name: /cart/i })).not.toBeInTheDocument();
  });

  it("updates cart totals immediately without an Update button", () => {
    render(
      <CartContents
        initialItems={[
          {
            available: 5,
            id: "cart-item",
            imageUrl: null,
            product: {
              city: "Ikeja",
              delivery_available: true,
              delivery_fee_minor: 250_000,
              id: "product",
              name: "RAV4 rim",
              pickup_available: true,
              price_minor: 4_500_000,
              slug: "rav4-rim",
              state: "Lagos",
            },
            quantity: 1,
            sellerName: "Raven Express",
          },
        ]}
      />,
    );

    expect(screen.queryByRole("button", { name: "Update" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Increase quantity of RAV4 rim" }));
    expect(screen.getAllByText(/90,000\.00/).length).toBeGreaterThan(0);
  });
});
