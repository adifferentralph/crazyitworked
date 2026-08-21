import type {
  ProductCondition,
  ProductImageType,
  ProductStatus,
} from "@/lib/supabase/database.types";

export const PRODUCT_MEDIA_BUCKET = "product-media";
export const MAX_PRODUCT_IMAGE_BYTES = 8 * 1024 * 1024;

export const productConditions: ReadonlyArray<{ label: string; value: ProductCondition }> = [
  { label: "New", value: "NEW" },
  { label: "Used", value: "USED" },
  { label: "Refurbished", value: "REFURBISHED" },
  { label: "Reconditioned", value: "RECONDITIONED" },
  { label: "OEM take-off", value: "OEM_TAKE_OFF" },
  { label: "Aftermarket", value: "AFTERMARKET" },
];

export const requiredProductImageSlots: ReadonlyArray<{
  description: string;
  field: string;
  label: string;
  type: ProductImageType;
}> = [
  {
    description: "A clear front-facing image used as the listing cover.",
    field: "primaryImage",
    label: "Main product image",
    type: "PRIMARY",
  },
  {
    description: "A second angle showing the complete part.",
    field: "angleImage",
    label: "Additional product angle",
    type: "ANGLE",
  },
  {
    description: "A close detail that helps a buyer assess condition.",
    field: "detailImage",
    label: "Detail image",
    type: "DETAIL",
  },
  {
    description: "The OEM number, manufacturer marking, stamp, or casting.",
    field: "partNumberImage",
    label: "Part-number or marking image",
    type: "PART_NUMBER",
  },
  {
    description: "Packaging, label, or another useful verification view.",
    field: "packagingImage",
    label: "Packaging or verification image",
    type: "PACKAGING",
  },
];

export const productStatusLabels: Record<ProductStatus, string> = {
  APPROVED: "Approved",
  DRAFT: "Draft",
  FLAGGED: "Flagged",
  NEEDS_CHANGES: "Needs changes",
  OUT_OF_STOCK: "Out of stock",
  PENDING_REVIEW: "Pending review",
  REJECTED: "Rejected",
  SUSPENDED: "Suspended",
};

const mimeExtensions: Record<string, readonly string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
};

export function validateProductImage(file: File) {
  if (!mimeExtensions[file.type]) {
    return "Use a JPEG, PNG, or WebP image.";
  }

  if (file.size <= 0 || file.size > MAX_PRODUCT_IMAGE_BYTES) {
    return "Each image must be larger than 0 bytes and no more than 8 MB.";
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !mimeExtensions[file.type]?.includes(extension)) {
    return "The image extension must match its file type.";
  }

  return null;
}

export function getSafeImageExtension(mimeType: string) {
  return mimeExtensions[mimeType]?.[0] ?? null;
}

export function formatNgn(priceMinor: number) {
  return new Intl.NumberFormat("en-NG", {
    currency: "NGN",
    maximumFractionDigits: priceMinor % 100 === 0 ? 0 : 2,
    style: "currency",
  }).format(priceMinor / 100);
}

export function priceMinorToInput(priceMinor: number) {
  const naira = Math.floor(priceMinor / 100);
  const kobo = priceMinor % 100;
  return kobo === 0 ? String(naira) : `${naira}.${String(kobo).padStart(2, "0")}`;
}

export function priceInputToMinor(value: string) {
  const [naira = "0", kobo = ""] = value.split(".");
  return Number(naira) * 100 + Number(kobo.padEnd(2, "0"));
}

export function slugifyProduct(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

export function conditionRequiresActualItem(condition: ProductCondition) {
  return !["NEW", "AFTERMARKET"].includes(condition);
}
