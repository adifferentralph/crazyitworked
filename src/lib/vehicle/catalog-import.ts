const preferredCasing = new Map(
  [
    "ACURA",
    "AUDI",
    "BAIC",
    "BMW",
    "BYD",
    "DAF",
    "GAC",
    "GMC",
    "HINO",
    "JAC",
    "KIA",
    "MAN",
    "MG",
    "MINI",
    "RAM",
    "SAAB",
    "SEAT",
    "TVR",
    "UAZ",
  ].map((name) => [name, name]),
);

export const regionalVehicleMakeSupplement = [
  "Alfa Romeo",
  "Aston Martin",
  "BAIC",
  "Bentley",
  "BYD",
  "Changan",
  "Chery",
  "Citroen",
  "Dacia",
  "Daewoo",
  "Datsun",
  "Dongfeng",
  "Foton",
  "GAC",
  "Geely",
  "Great Wall",
  "Haval",
  "Hino",
  "Holden",
  "JAC",
  "Lada",
  "Mahindra",
  "MAN",
  "MG",
  "Oldsmobile",
  "Opel",
  "Pontiac",
  "Proton",
  "Saab",
  "Saturn",
  "Scania",
  "Skoda",
  "Tata",
  "Vauxhall",
] as const;

export const discontinuedVehicleMakes = new Set([
  "daewoo",
  "datsun",
  "holden",
  "oldsmobile",
  "pontiac",
  "saab",
  "saturn",
]);

function formatSegment(value: string) {
  const known = preferredCasing.get(value.toUpperCase());
  if (known) return known;
  return value
    .toLocaleLowerCase("en")
    .replace(/(^|[-'])\p{L}/gu, (character) =>
      character.toLocaleUpperCase("en"),
    );
}

export function normalizeMakeName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map(formatSegment)
    .join(" ");
}

export function slugifyVehicleName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
