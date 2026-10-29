export const ANAMBRA_LGAS = [
  "Aguata",
  "Anambra East",
  "Anambra West",
  "Anaocha",
  "Awka North",
  "Awka South",
  "Ayamelum",
  "Dunukofia",
  "Ekwusigo",
  "Idemili North",
  "Idemili South",
  "Ihiala",
  "Njikoka",
  "Nnewi North",
  "Nnewi South",
  "Ogbaru",
  "Onitsha North",
  "Onitsha South",
  "Orumba North",
  "Orumba South",
  "Oyi",
] as const;

const normalizedLgas = new Set(ANAMBRA_LGAS.map((lga) => lga.toLowerCase()));

export function isAnambraLga(value: string) {
  return normalizedLgas.has(value.trim().toLowerCase());
}
