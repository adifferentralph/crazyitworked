import { describe, expect, it } from "vitest";

import {
  conditionRequiresActualItem,
  formatNgn,
  priceInputToMinor,
  priceMinorToInput,
  slugifyProduct,
  validateProductImage,
} from "@/lib/marketplace/products";
import { productFormSchema } from "@/lib/validation/seller";

describe("seller product rules", () => {
  it("converts NGN input to exact minor units and back", () => {
    expect(priceInputToMinor("45000.25")).toBe(4_500_025);
    expect(priceMinorToInput(4_500_025)).toBe("45000.25");
    expect(formatNgn(4_500_000)).toContain("45,000");
  });

  it("uses stable, URL-safe product slugs", () => {
    expect(slugifyProduct("Toyota Camry — Brake Pads! ")).toBe("toyota-camry-brake-pads");
  });

  it("requires an actual-item image for non-new conditions", () => {
    expect(conditionRequiresActualItem("USED")).toBe(true);
    expect(conditionRequiresActualItem("REFURBISHED")).toBe(true);
    expect(conditionRequiresActualItem("NEW")).toBe(false);
    expect(conditionRequiresActualItem("AFTERMARKET")).toBe(false);
  });

  it("rejects mismatched and oversized image uploads", () => {
    expect(validateProductImage(new File(["image"], "part.png", { type: "image/png" }))).toBeNull();
    expect(validateProductImage(new File(["image"], "part.jpg", { type: "image/png" }))).toMatch(/extension/i);
    const oversized = new File([new Uint8Array(8 * 1024 * 1024 + 1)], "part.webp", { type: "image/webp" });
    expect(validateProductImage(oversized)).toMatch(/8 MB/i);
  });

  it("validates fulfilment and NGN price server-side", () => {
    const result = productFormSchema.safeParse({
      brand: "Denso",
      categoryId: "c4769a8e-469b-4fde-a0cd-c3f796269f27",
      city: "Ikeja",
      condition: "NEW",
      country: "Nigeria",
      crossReferences: "ABC-1",
      deliveryAvailable: false,
      description: "A clear and sufficiently detailed product description.",
      fitmentIds: [],
      intent: "save-draft",
      manufacturerPartNumber: "",
      name: "Toyota Camry brake pad set",
      oemPartNumber: "",
      pickupAvailable: false,
      priceNgn: "45,000",
      quantity: 4,
      sku: "TEST-001",
      state: "Lagos",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.priceNgn).toBeDefined();
      expect(result.error.flatten().fieldErrors.deliveryAvailable).toBeDefined();
    }
  });
});
