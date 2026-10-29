import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProductForm, type ProductFormDefaults } from "@/components/seller/product-form";
import type { SellerActionState } from "@/lib/marketplace/seller-action-state";

vi.mock("@/app/(protected)/seller/actions", () => ({
  createProductAction: vi.fn(),
  updateProductAction: vi.fn(),
}));

const defaults: ProductFormDefaults = {
  brand: "",
  categoryId: "c4769a8e-469b-4fde-a0cd-c3f796269f27",
  city: "Ikeja",
  condition: "USED",
  crossReferences: "",
  deliveryAvailable: true,
  deliveryFeeNgn: "0.00",
  description: "A clean alloy rim in good working condition.",
  fitmentIds: [],
  imageTypes: [],
  manufacturerPartNumber: "",
  name: "Toyota alloy rim",
  oemPartNumber: "",
  pickupAvailable: true,
  priceNgn: "45000",
  pickupLocationId: "22222222-2222-4222-8222-222222222222",
  quantity: 1,
  sku: "",
  state: "Lagos",
  weightKg: "12.5",
};

type ProductFormAction = (
  previousState: SellerActionState,
  formData: FormData,
) => Promise<SellerActionState>;

describe("seller product form", () => {
  it("highlights publish errors without clearing entered product information", async () => {
    const action = vi.fn<ProductFormAction>(async () => ({ status: "success" }));
    render(
      <ProductForm
        actionOverride={action}
        categories={[{ id: defaults.categoryId, label: "Wheels and rims" }]}
        defaults={defaults}
        makes={[]}
        mode="create"
      />,
    );

    const name = screen.getByLabelText(/Part name/);
    fireEvent.change(name, { target: { value: "18 inch alloy rim" } });
    fireEvent.click(screen.getByRole("button", { name: "Publish product" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("highlighted fields");
    expect(name).toHaveValue("18 inch alloy rim");
    expect(screen.getByText("Choose at least one car this part fits.")).toBeInTheDocument();
    expect(
      screen.getByText("Add five genuine photos of this product before publishing."),
    ).toBeInTheDocument();
    expect(action).not.toHaveBeenCalled();
  });

  it("allows a draft with optional brand and seller SKU blank", async () => {
    const action = vi.fn<ProductFormAction>(async () => ({ status: "success" }));
    render(
      <ProductForm
        actionOverride={action}
        categories={[{ id: defaults.categoryId, label: "Wheels and rims" }]}
        defaults={defaults}
        makes={[]}
        mode="create"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    const submitted = action.mock.calls[0]?.[1];
    expect(submitted).toBeInstanceOf(FormData);
    expect(submitted?.get("brand")).toBe("");
    expect(submitted?.get("sku")).toBe("");
  });

  it("saves a published product through the readiness-checked update action", async () => {
    const action = vi.fn<ProductFormAction>(async () => ({ status: "success" }));
    render(
      <ProductForm
        actionOverride={action}
        categories={[{ id: defaults.categoryId, label: "Wheels and rims" }]}
        defaults={{
          ...defaults,
          fitmentIds: ["36696eaa-8990-456b-a97d-173445398ae1"],
          imageTypes: ["PRIMARY", "ANGLE", "DETAIL", "PART_NUMBER", "PACKAGING"],
          productId: "6fae1e05-ea63-4cb2-a46b-0e73b879e50b",
        }}
        makes={[]}
        mode="edit"
        pickupLocations={[{
          id: "22222222-2222-4222-8222-222222222222",
          isDefault: true,
          label: "Main shop",
          lga: "Ikeja",
          town: "Ikeja",
        }]}
        published
      />,
    );

    expect(screen.queryByRole("button", { name: "Save draft" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(action.mock.calls[0]?.[1].get("intent")).toBe("submit-review");
  });
});
