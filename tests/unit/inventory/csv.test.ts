import { describe, expect, it } from "vitest";

import { normalizeInventoryRow, parseInventoryCsv } from "@/lib/inventory/csv";

describe("controlled inventory CSV", () => {
  it("parses quoted commas and produces exact NGN minor units", () => {
    const [record] = parseInventoryCsv([
      "SKU,Part Name,Category,Brand,Condition,Price,Quantity,Location,Description",
      'BP-001,"Brake pad, front",Brake System,Bosch,NEW,45000.50,12,"Ikeja, Lagos","Ceramic, boxed"',
    ].join("\n"));
    const result = normalizeInventoryRow(record!);
    expect(result.errors).toEqual([]);
    expect(result.normalized).toMatchObject({
      city: "Ikeja",
      priceMinor: 4_500_050,
      quantity: 12,
      state: "Lagos",
    });
  });

  it.each(["45000.999", "-1", "NGN 500", "1e4"])("rejects invalid money %s", (price) => {
    const [record] = parseInventoryCsv([
      "SKU,Part Name,Category,Brand,Condition,Price,Quantity,Location",
      `BP-002,Brake pad,Brake System,Bosch,NEW,${price},2,"Ikeja, Lagos"`,
    ].join("\n"));
    expect(normalizeInventoryRow(record!).errors).toContain(
      "Price must be a valid NGN amount with no more than two decimal places.",
    );
  });

  it("rejects negative stock and incomplete vehicle fitment", () => {
    const [record] = parseInventoryCsv([
      "SKU,Part Name,Category,Brand,Condition,Price,Quantity,Location,Vehicle Make",
      'BP-003,Brake pad,Brake System,Bosch,USED,1000,-2,"Ikeja, Lagos",Toyota',
    ].join("\n"));
    const result = normalizeInventoryRow(record!);
    expect(result.errors).toContain("Quantity must be a whole number.");
    expect(result.errors).toContain("Vehicle Make, Vehicle Model, and Year From must be supplied together.");
  });

  it("rejects duplicate headers and malformed row widths", () => {
    expect(() => parseInventoryCsv("SKU,SKU,Part Name,Category,Brand,Condition,Price,Quantity\n1,2,Pad,Brake,Bosch,NEW,10,1")).toThrow(/duplicate column headers/i);
    expect(() => parseInventoryCsv("SKU,Part Name,Category,Brand,Condition,Price,Quantity\n1,Pad,Brake,Bosch,NEW,10")).toThrow(/expected 7/i);
  });
});