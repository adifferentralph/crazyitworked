import { createHash } from "node:crypto";

import type { ProductCondition } from "@/lib/supabase/database.types";
import { priceInputToMinor } from "@/lib/marketplace/products";

export const MAX_INVENTORY_CSV_BYTES = 2 * 1024 * 1024;
export const MAX_INVENTORY_CSV_ROWS = 1_000;

export type InventoryCsvRecord = {
  raw: Record<string, string>;
  rowNumber: number;
};

export type NormalizedInventoryRow = {
  brand: string;
  category: string;
  city: string;
  condition: ProductCondition;
  description: string;
  manufacturerPartNumber: string;
  name: string;
  oemPartNumber: string;
  priceMinor: number;
  quantity: number;
  sku: string;
  state: string;
  vehicleMake: string;
  vehicleModel: string;
  yearFrom: number | null;
  yearTo: number | null;
};

const requiredHeaders = ["sku", "partname", "category", "brand", "condition", "price", "quantity"];
const allowedConditions = new Set<ProductCondition>([
  "NEW",
  "USED",
  "REFURBISHED",
  "RECONDITIONED",
  "OEM_TAKE_OFF",
  "AFTERMARKET",
]);

function headerKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseCsvMatrix(input: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index]!;
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      if (field.length > 0) throw new Error("A quoted CSV field must start with a quote.");
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error("The CSV contains an unterminated quoted field.");
  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}

export function parseInventoryCsv(input: string): InventoryCsvRecord[] {
  const matrix = parseCsvMatrix(input.replace(/^\uFEFF/, ""));
  if (matrix.length < 2) throw new Error("The CSV must contain a header and at least one data row.");

  const headers = matrix[0]!.map(headerKey);
  if (new Set(headers).size !== headers.length) throw new Error("The CSV contains duplicate column headers.");
  const missing = requiredHeaders.filter((header) => !headers.includes(header));
  if (missing.length > 0) throw new Error(`Missing required CSV columns: ${missing.join(", ")}.`);

  const dataRows = matrix.slice(1).filter((values) => values.some((value) => value.trim() !== ""));
  if (dataRows.length > MAX_INVENTORY_CSV_ROWS) {
    throw new Error(`A single import can contain at most ${MAX_INVENTORY_CSV_ROWS} rows.`);
  }

  return dataRows.map((values, index) => {
    if (values.length !== headers.length) {
      throw new Error(`CSV row ${index + 2} has ${values.length} fields; expected ${headers.length}.`);
    }
    return {
      raw: Object.fromEntries(headers.map((header, column) => [header, values[column]!.trim()])),
      rowNumber: index + 2,
    };
  });
}

function integer(value: string, label: string, errors: string[], options?: { min?: number; max?: number }) {
  if (!/^\d+$/.test(value)) {
    errors.push(`${label} must be a whole number.`);
    return null;
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < (options?.min ?? 0) || parsed > (options?.max ?? Number.MAX_SAFE_INTEGER)) {
    errors.push(`${label} is outside the allowed range.`);
    return null;
  }
  return parsed;
}

export function normalizeInventoryRow(record: InventoryCsvRecord) {
  const value = (key: string) => record.raw[headerKey(key)] ?? "";
  const errors: string[] = [];
  const sku = value("SKU").slice(0, 100);
  const name = value("Part Name").slice(0, 160);
  const category = value("Category").slice(0, 160);
  const brand = value("Brand").slice(0, 120);
  const condition = value("Condition").toUpperCase().replace(/[ -]+/g, "_") as ProductCondition;

  if (sku.length < 2) errors.push("SKU must contain at least 2 characters.");
  if (name.length < 3) errors.push("Part Name must contain at least 3 characters.");
  if (!category) errors.push("Category is required.");
  if (!brand) errors.push("Brand is required.");
  if (!allowedConditions.has(condition)) errors.push("Condition is not supported.");

  let priceMinor = 0;
  const price = value("Price");
  if (!/^\d+(\.\d{1,2})?$/.test(price)) {
    errors.push("Price must be a valid NGN amount with no more than two decimal places.");
  } else {
    priceMinor = priceInputToMinor(price);
    if (!Number.isSafeInteger(priceMinor) || priceMinor <= 0) {
      errors.push("Price must be greater than zero and within the supported range.");
    }
  }

  const quantity = integer(value("Quantity"), "Quantity", errors, { min: 0 }) ?? 0;
  const yearFromText = value("Year From");
  const yearToText = value("Year To");
  const yearFrom = yearFromText ? integer(yearFromText, "Year From", errors, { min: 1950, max: 2100 }) : null;
  const yearTo = yearToText ? integer(yearToText, "Year To", errors, { min: 1950, max: 2100 }) : yearFrom;
  if (yearFrom !== null && yearTo !== null && yearTo < yearFrom) errors.push("Year To cannot be before Year From.");

  const location = value("Location").split(",").map((part) => part.trim()).filter(Boolean);
  const city = (value("City") || location[0] || "").slice(0, 100);
  const state = (value("State") || location[1] || "").slice(0, 100);
  if (!city || !state) errors.push('Location must be "City, State" or use separate City and State columns.');

  const normalized: NormalizedInventoryRow = {
    brand,
    category,
    city,
    condition,
    description: (value("Description") || `Imported inventory draft for ${name}. Seller review is required before submission.`).slice(0, 4_000),
    manufacturerPartNumber: value("Manufacturer Part Number").slice(0, 120),
    name,
    oemPartNumber: value("OEM").slice(0, 120),
    priceMinor,
    quantity,
    sku,
    state,
    vehicleMake: value("Vehicle Make").slice(0, 100),
    vehicleModel: value("Vehicle Model").slice(0, 100),
    yearFrom,
    yearTo,
  };

  if ((normalized.vehicleMake || normalized.vehicleModel || yearFrom !== null) &&
      !(normalized.vehicleMake && normalized.vehicleModel && yearFrom !== null)) {
    errors.push("Vehicle Make, Vehicle Model, and Year From must be supplied together.");
  }

  return { errors, normalized };
}

export function inventoryCsvSha256(bytes: ArrayBuffer) {
  return createHash("sha256").update(Buffer.from(bytes)).digest("hex");
}