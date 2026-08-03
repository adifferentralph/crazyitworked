import type { CatalogHit, VehicleSelection } from "@/lib/marketplace/types";

export function hasVehicleSelection(selection: VehicleSelection) {
  return Boolean(selection.year && selection.make && selection.model);
}

export function normalizeFitmentValue(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function productFitsVehicle(product: CatalogHit, selection: VehicleSelection) {
  if (!hasVehicleSelection(selection)) {
    return true;
  }

  const make = normalizeFitmentValue(selection.make ?? "");
  const model = normalizeFitmentValue(selection.model ?? "");
  const variant = normalizeFitmentValue(selection.variant ?? "");

  const makeMatches = product.fitmentMakes.map(normalizeFitmentValue).includes(make);
  const modelMatches = product.fitmentModels.map(normalizeFitmentValue).includes(model);
  const yearMatches = product.fitmentYears.includes(Number(selection.year));
  const variantMatches =
    !variant ||
    product.fitmentVariants.length === 0 ||
    product.fitmentVariants.map(normalizeFitmentValue).includes(variant);

  return yearMatches && makeMatches && modelMatches && variantMatches;
}

export function filterCompatibleProducts(products: CatalogHit[], selection: VehicleSelection) {
  return products.filter((product) => productFitsVehicle(product, selection));
}

export function buildAlgoliaFitmentFilter(selection: VehicleSelection) {
  const filters: string[] = [];

  if (selection.year) {
    filters.push(`fitmentYears:${Number(selection.year)}`);
  }

  if (selection.make) {
    filters.push(`fitmentMakes:"${escapeAlgoliaFilter(selection.make)}"`);
  }

  if (selection.model) {
    filters.push(`fitmentModels:"${escapeAlgoliaFilter(selection.model)}"`);
  }

  if (selection.variant) {
    filters.push(`fitmentVariants:"${escapeAlgoliaFilter(selection.variant)}"`);
  }

  return filters.join(" AND ");
}

function escapeAlgoliaFilter(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
