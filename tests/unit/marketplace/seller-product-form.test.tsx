import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createProductAction,
  prepareProductImageUploadsAction,
} from "@/app/(protected)/seller/actions";
import {
  getFileFreeProductFormData,
  ProductForm,
  type ProductFormDefaults,
} from "@/components/seller/product-form";
import type { SellerActionState } from "@/lib/marketplace/seller-action-state";

const { uploadToSignedUrl } = vi.hoisted(() => ({ uploadToSignedUrl: vi.fn() }));

vi.mock("@/app/(protected)/seller/actions", () => ({
  createProductAction: vi.fn(),
  prepareProductImageUploadsAction: vi.fn(),
  updateProductAction: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    storage: { from: () => ({ uploadToSignedUrl }) },
  }),
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
  beforeEach(() => {
    vi.clearAllMocks();
    uploadToSignedUrl.mockResolvedValue({ data: { path: "stored" }, error: null });
  });

  it("never includes image files in the Server Action payload", () => {
    const formData = new FormData();
    formData.set("name", "Toyota alloy rim");
    formData.set("primaryImage", new File(["photo"], "rim.jpg", { type: "image/jpeg" }));

    const safePayload = getFileFreeProductFormData(formData);

    expect(safePayload.get("name")).toBe("Toyota alloy rim");
    expect(safePayload.has("primaryImage")).toBe(false);
  });

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

  it("uploads selected photos directly and sends only references to the product action", async () => {
    const productId = "6fae1e05-ea63-4cb2-a46b-0e73b879e50b";
    const imageId = "5fae1e05-ea63-4cb2-a46b-0e73b879e50a";
    vi.mocked(prepareProductImageUploadsAction).mockResolvedValue({
      productId,
      status: "success",
      uploads: [{
        field: "primaryImage",
        imageId,
        mimeType: "image/jpeg",
        originalFilename: "rim.jpg",
        sizeBytes: 5,
        storagePath: `seller/${productId}/${imageId}.jpg`,
        token: "short-lived-token",
        type: "PRIMARY",
      }],
    });
    vi.mocked(createProductAction).mockResolvedValue({ status: "success" });
    render(
      <ProductForm
        categories={[{ id: defaults.categoryId, label: "Wheels and rims" }]}
        defaults={defaults}
        makes={[]}
        mode="create"
      />,
    );

    const imageInput = screen.getByLabelText("Main product image");
    const imageFile = new File(["photo"], "rim.jpg", { type: "image/jpeg" });
    Object.defineProperty(imageInput, "files", {
      configurable: true,
      value: [imageFile],
    });
    fireEvent.change(imageInput);
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));

    await waitFor(() => expect(createProductAction).toHaveBeenCalledTimes(1));
    expect(prepareProductImageUploadsAction).toHaveBeenCalledTimes(1);
    expect(uploadToSignedUrl).toHaveBeenCalledWith(
      `seller/${productId}/${imageId}.jpg`,
      "short-lived-token",
      expect.any(File),
      expect.objectContaining({ contentType: "image/jpeg", upsert: false }),
    );
    const submitted = vi.mocked(createProductAction).mock.calls[0]?.[1];
    expect(submitted?.has("primaryImage")).toBe(false);
    expect(submitted?.get("productId")).toBe(productId);
    expect(String(submitted?.get("uploadedImages"))).toContain(imageId);
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
