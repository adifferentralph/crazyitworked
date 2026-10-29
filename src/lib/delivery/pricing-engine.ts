export type DeliveryPricingRule = {
  baseChargeMinor: number;
  bulkySurchargeMinor: number;
  costPerKmMinor: number;
  fragileSurchargeMinor: number;
  handlingChargeMinor: number;
  marketplaceMarkupMinor: number;
  maximumAutomaticFeeMinor: number;
  minimumChargeMinor: number;
  roundingStepMinor: number;
};

export type WeightBracket = {
  maxGrams: number | null;
  minGrams: number;
  surchargeMinor: number;
};

export type VehicleCategory = {
  code: string;
  maxHeightMm: number | null;
  maxLengthMm: number | null;
  maxWeightGrams: number;
  maxWidthMm: number | null;
  surchargeMinor: number;
};

export type ShipmentDimensions = {
  heightMm: number | null;
  lengthMm: number | null;
  widthMm: number | null;
};

function supportsDimension(limit: number | null, value: number | null) {
  return value === null || (limit !== null && value <= limit);
}
export function chooseVehicleCategory(
  vehicles: VehicleCategory[],
  weightGrams: number,
  dimensions: ShipmentDimensions,
) {
  return [...vehicles]
    .sort((left, right) => left.maxWeightGrams - right.maxWeightGrams)
    .find(
      (vehicle) =>
        weightGrams <= vehicle.maxWeightGrams &&
        supportsDimension(vehicle.maxLengthMm, dimensions.lengthMm) &&
        supportsDimension(vehicle.maxWidthMm, dimensions.widthMm) &&
        supportsDimension(vehicle.maxHeightMm, dimensions.heightMm),
    );
}

export function getWeightSurcharge(brackets: WeightBracket[], weightGrams: number) {
  return (
    [...brackets]
      .sort((left, right) => left.minGrams - right.minGrams)
      .find(
        (bracket) =>
          weightGrams >= bracket.minGrams &&
          (bracket.maxGrams === null || weightGrams < bracket.maxGrams),
      )?.surchargeMinor ?? 0
  );
}

function roundUp(value: number, step: number) {
  return Math.ceil(value / step) * step;
}

export function calculateShipmentCharge(input: {
  distanceMeters: number | null;
  fallbackRouteChargeMinor: number | null;
  hasBulkyItem: boolean;
  hasFragileItem: boolean;
  pricing: DeliveryPricingRule;
  vehicle: VehicleCategory;
  weightBrackets: WeightBracket[];
  weightGrams: number;
}) {
  const distanceChargeMinor = input.distanceMeters !== null
    ? Math.ceil((input.distanceMeters / 1000) * input.pricing.costPerKmMinor)
    : input.fallbackRouteChargeMinor;

  if (distanceChargeMinor === null) return null;

  const weightSurchargeMinor = getWeightSurcharge(input.weightBrackets, input.weightGrams);
  const fragileSurchargeMinor = input.hasFragileItem
    ? input.pricing.fragileSurchargeMinor
    : 0;
  const bulkySurchargeMinor = input.hasBulkyItem ? input.pricing.bulkySurchargeMinor : 0;
  const unroundedActualMinor =
    input.pricing.baseChargeMinor +
    distanceChargeMinor +
    weightSurchargeMinor +
    input.pricing.handlingChargeMinor +
    fragileSurchargeMinor +
    bulkySurchargeMinor +
    input.vehicle.surchargeMinor;
  const actualCostMinor = roundUp(
    Math.max(input.pricing.minimumChargeMinor, unroundedActualMinor),
    input.pricing.roundingStepMinor,
  );
  const platformComponentMinor = input.pricing.marketplaceMarkupMinor;
  const customerChargeMinor = roundUp(
    actualCostMinor + platformComponentMinor,
    input.pricing.roundingStepMinor,
  );

  if (customerChargeMinor > input.pricing.maximumAutomaticFeeMinor) return null;

  return {
    actualCostMinor,
    customerChargeMinor,
    platformComponentMinor,
    pricingBreakdown: {
      baseChargeMinor: input.pricing.baseChargeMinor,
      bulkySurchargeMinor,
      distanceChargeMinor,
      fragileSurchargeMinor,
      handlingChargeMinor: input.pricing.handlingChargeMinor,
      marketplaceMarkupMinor: platformComponentMinor,
      vehicleSurchargeMinor: input.vehicle.surchargeMinor,
      weightSurchargeMinor,
    },
  };
}
