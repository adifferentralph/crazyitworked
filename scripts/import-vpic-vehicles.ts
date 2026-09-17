import { setTimeout as delay } from "node:timers/promises";

import { config } from "dotenv";
import { eq, ilike, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { z } from "zod";

import {
  vehicleFitments,
  vehicleMakes,
  vehicleModels,
  vehicleYears,
} from "../src/db/schema";
import {
  discontinuedVehicleMakes,
  normalizeMakeName,
  regionalVehicleMakeSupplement,
  slugifyVehicleName,
} from "../src/lib/vehicle/catalog-import";

config({ path: ".env.local" });

const environment = z
  .object({
    DATABASE_URL: z.string().url().startsWith("postgresql://"),
  })
  .parse(process.env);

const makeResponseSchema = z.object({
  Results: z.array(
    z.object({
      Make_ID: z.number(),
      Make_Name: z.string().min(1),
    }),
  ),
});

const modelResponseSchema = z.object({
  Results: z.array(
    z.object({
      Model_ID: z.number(),
      Model_Name: z.string().min(1),
    }),
  ),
});

const defaultModelMakes = [
  "Toyota",
  "Honda",
  "Lexus",
  "Mercedes-Benz",
  "BMW",
  "Volkswagen",
  "Peugeot",
  "Ford",
  "Hyundai",
  "KIA",
  "Nissan",
  "Land Rover",
  "Mazda",
  "Mitsubishi",
  "BYD",
  "Saab",
] as const;

function getArgument(name: string) {
  return process.argv
    .slice(2)
    .find((argument) => argument.startsWith(`--${name}=`))
    ?.slice(name.length + 3);
}

const currentYear = new Date().getUTCFullYear();
const startYear = z.coerce.number().int().min(1996).max(currentYear + 1).parse(
  getArgument("start-year") ?? "1996",
);
const endYear = z.coerce.number().int().min(startYear).max(currentYear + 1).parse(
  getArgument("end-year") ?? String(currentYear + 1),
);
const requestedModelMakes = (getArgument("model-makes")?.split(",") ?? defaultModelMakes)
  .map((name) => normalizeMakeName(name))
  .filter(Boolean);

async function fetchJson(url: string) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(url, {
      headers: { "user-agent": "Twenty-Two Parts vehicle catalogue importer" },
      signal: AbortSignal.timeout(30_000),
    });
    if (response.ok) return response.json();
    if (attempt === 3 || (response.status < 500 && response.status !== 429)) {
      throw new Error(`vPIC request failed with HTTP ${response.status}: ${url}`);
    }
    await delay(attempt * 1_000);
  }
  throw new Error("vPIC request failed after retries.");
}

function chunks<T>(values: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

type ImportedMake = {
  isDiscontinued: boolean;
  name: string;
  slug: string;
  source: string;
  sourceIdentifier: string;
};

type ImportedModel = {
  name: string;
  slug: string;
  sourceIdentifier: string;
  years: Set<number>;
};

function addModel(
  models: Map<string, ImportedModel>,
  result: z.infer<typeof modelResponseSchema>["Results"][number],
  year?: number,
) {
  const name = normalizeMakeName(result.Model_Name);
  const slug = slugifyVehicleName(name) || `vpic-model-${result.Model_ID}`;
  const existing = models.get(slug) ?? {
    name,
    slug,
    sourceIdentifier: String(result.Model_ID),
    years: new Set<number>(),
  };
  if (year) existing.years.add(year);
  models.set(slug, existing);
}

async function main() {
  const client = postgres(environment.DATABASE_URL, {
    max: 1,
    prepare: false,
  });
  const db = drizzle({ client });

  try {
    const parsed = makeResponseSchema.parse(
      await fetchJson("https://vpic.nhtsa.dot.gov/api/vehicles/GetAllMakes?format=json"),
    );
    const makesBySlug = new Map<string, ImportedMake>();

    for (const result of parsed.Results) {
      const name = normalizeMakeName(result.Make_Name);
      const slug = slugifyVehicleName(name) || `vpic-make-${result.Make_ID}`;
      makesBySlug.set(slug, {
        isDiscontinued: discontinuedVehicleMakes.has(name.toLocaleLowerCase("en")),
        name,
        slug,
        source: "NHTSA_VPIC",
        sourceIdentifier: String(result.Make_ID),
      });
    }

    for (const name of regionalVehicleMakeSupplement) {
      const slug = slugifyVehicleName(name);
      if (!makesBySlug.has(slug)) {
        makesBySlug.set(slug, {
          isDiscontinued: discontinuedVehicleMakes.has(name.toLocaleLowerCase("en")),
          name,
          slug,
          source: "REGIONAL_SUPPLEMENT",
          sourceIdentifier: `regional:${slug}`,
        });
      }
    }

    const makeRows = [...makesBySlug.values()];
    for (const batch of chunks(makeRows, 500)) {
      await db.insert(vehicleMakes).values(batch).onConflictDoNothing();
    }

    for (const legacyName of discontinuedVehicleMakes) {
      await db
        .update(vehicleMakes)
        .set({ isDiscontinued: true })
        .where(ilike(vehicleMakes.name, legacyName));
    }

    let importedModelCount = 0;
    let importedYearCount = 0;
    let importedFitmentCount = 0;

    for (const requestedName of requestedModelMakes) {
      const importedMake = makeRows.find(
        (row) =>
          row.name.toLocaleLowerCase("en") === requestedName.toLocaleLowerCase("en"),
      );
      if (!importedMake || importedMake.source !== "NHTSA_VPIC") {
        console.warn(`Skipping ${requestedName}: no NHTSA vPIC make identifier.`);
        continue;
      }

      const [databaseMake] = await db
        .select({ id: vehicleMakes.id })
        .from(vehicleMakes)
        .where(eq(vehicleMakes.slug, importedMake.slug))
        .limit(1);
      if (!databaseMake) throw new Error(`Imported make was not found: ${importedMake.name}`);

      const models = new Map<string, ImportedModel>();
      const allModels = modelResponseSchema.parse(
        await fetchJson(
          `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeId/${importedMake.sourceIdentifier}?format=json`,
        ),
      );
      for (const model of allModels.Results) addModel(models, model);

      for (let year = startYear; year <= endYear; year += 1) {
        const yearModels = modelResponseSchema.parse(
          await fetchJson(
            `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeIdYear/makeId/${importedMake.sourceIdentifier}/modelyear/${year}?format=json`,
          ),
        );
        for (const model of yearModels.Results) addModel(models, model, year);
        await delay(75);
      }

      const modelRows = [...models.values()].map((model) => ({
        makeId: databaseMake.id,
        name: model.name,
        slug: model.slug,
        source: "NHTSA_VPIC",
        sourceIdentifier: model.sourceIdentifier,
      }));
      for (const batch of chunks(modelRows, 500)) {
        await db.insert(vehicleModels).values(batch).onConflictDoNothing();
      }

      const databaseModels = await db
        .select({ id: vehicleModels.id, slug: vehicleModels.slug })
        .from(vehicleModels)
        .where(eq(vehicleModels.makeId, databaseMake.id));
      const modelIdBySlug = new Map(databaseModels.map((model) => [model.slug, model.id]));
      const yearRows = [...models.values()].flatMap((model) => {
        const modelId = modelIdBySlug.get(model.slug);
        return modelId
          ? [...model.years].map((year) => ({ modelId, year }))
          : [];
      });
      for (const batch of chunks(yearRows, 500)) {
        await db.insert(vehicleYears).values(batch).onConflictDoNothing();
      }

      const modelIds = [...modelIdBySlug.values()];
      const databaseYears = modelIds.length
        ? await db
            .select({ id: vehicleYears.id, modelId: vehicleYears.modelId, year: vehicleYears.year })
            .from(vehicleYears)
            .where(inArray(vehicleYears.modelId, modelIds))
        : [];
      const importedYears = new Set(
        yearRows.map((row) => `${row.modelId}:${row.year}`),
      );
      const baseFitments = databaseYears
        .filter((year) => importedYears.has(`${year.modelId}:${year.year}`))
        .map((year) => ({
          makeId: databaseMake.id,
          modelId: year.modelId,
          yearId: year.id,
        }));
      for (const batch of chunks(baseFitments, 500)) {
        await db.insert(vehicleFitments).values(batch).onConflictDoNothing();
      }

      importedModelCount += modelRows.length;
      importedYearCount += yearRows.length;
      importedFitmentCount += baseFitments.length;
      console.log(
        `Imported ${modelRows.length} models and ${yearRows.length} model-years for ${importedMake.name}.`,
      );
    }

    console.log(`Vehicle import complete: ${makeRows.length} makes, ${importedModelCount} selected-make models, ${importedYearCount} model-years, and ${importedFitmentCount} local base fitments.`);
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error("Vehicle catalogue import failed.");
  console.error(error instanceof Error ? error.message : "Unknown import error");
  process.exitCode = 1;
});
