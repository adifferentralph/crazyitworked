import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProductImageGallery } from "@/components/marketplace/product-image-gallery";

describe("product image gallery", () => {
  it("moves a tapped thumbnail into the large product image", () => {
    render(
      <ProductImageGallery
        images={[
          { id: "primary", signedUrl: "https://example.com/primary.jpg", type: "PRIMARY" },
          { id: "detail", signedUrl: "https://example.com/detail.jpg", type: "DETAIL" },
        ]}
        initialImageId="primary"
        productName="Toyota RAV4 rim"
      />,
    );

    expect(screen.getByRole("img", { name: "Toyota RAV4 rim main photo" })).toHaveAttribute(
      "src",
      "https://example.com/primary.jpg",
    );

    fireEvent.click(screen.getByRole("button", { name: "Show detail" }));

    expect(screen.getByRole("img", { name: "Toyota RAV4 rim detail" })).toHaveAttribute(
      "src",
      "https://example.com/detail.jpg",
    );
    expect(screen.getByRole("button", { name: "Show detail" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
