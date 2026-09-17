import { config } from "dotenv";
import { inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import {
  getAvailableYears,
  getDataSources,
  getModels,
} from "@meterapp/vehicle-db";
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
  slugifyVehicleName,
} from "../src/lib/vehicle/catalog-import";

config({ path: ".env.local" });

const environment = z
  .object({ DATABASE_URL: z.string().url().startsWith("postgresql://") })
  .parse(process.env);

const supportedVehicleTypeIds = [2, 3, 7] as const;

function chunks<T>(values: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

type CatalogueModel = {
  makeName: string;
  makeSlug: string;
  modelName: string;
  modelSlug: string;
  modelIdentifier: string;
  years: Set<number>;
};

async function main() {
  const client = postgres(environment.DATABASE_URL, { max: 1, prepare: false });
  const db = drizzle({ client });

  try {
    const years = getAvailableYears().filter(
      (year) => year >= 1990 && year <= new Date().getUTCFullYear() + 1,
    );
    const modelsByKey = new Map<string, CatalogueModel>();

    for (const year of years) {
      for (const vehicleTypeId of supportedVehicleTypeIds) {
        for (const model of getModels({ year, vehicleTypeId })) {
          const makeName = normalizeMakeName(model.makeName);
          const modelName = normalizeMakeName(model.modelName);
          const makeSlug = slugifyVehicleName(makeName);
          const modelSlug = slugifyVehicleName(modelName);
          if (!makeSlug || !modelSlug) continue;

          const key = `${makeSlug}:${modelSlug}`;
          const existing = modelsByKey.get(key) ?? {
            makeName,
            makeSlug,
            modelName,
            modelSlug,
            modelIdentifier: String(model.modelId),
            years: new Set<number>(),
          };
          existing.years.add(year);
          modelsByKey.set(key, existing);
        }
      }
    }

    const makeRows = [
      ...new Map(
        [...modelsByKey.values()].map((model) => [model.makeSlug, model]),
      ).values(),
    ].map((model) => ({
      isDiscontinued: discontinuedVehicleMakes.has(
        model.makeName.toLocaleLowerCase("en"),
      ),
      name: model.makeName,
      slug: model.makeSlug,
      source: "METERAPP_VEHICLE_DB",
      sourceIdentifier: `meterapp:${model.makeSlug}`,
    }));

    for (const batch of chunks(makeRows, 500)) {
      await db.insert(vehicleMakes).values(batch).onConflictDoNothing();
    }

    const makeSlugs = makeRows.map((make) => make.slug);
    const databaseMakes = makeSlugs.length
      ? await db
          .select({ id: vehicleMakes.id, slug: vehicleMakes.slug })
          .from(vehicleMakes)
          .where(inArray(vehicleMakes.slug, makeSlugs))
      : [];
    const makeIdBySlug = new Map(databaseMakes.map((make) => [make.slug, make.id]));

    const modelRows = [...modelsByKey.values()].flatMap((model) => {
      const makeId = makeIdBySlug.get(model.makeSlug);
      return makeId
        ? [
            {
              makeId,
              name: model.modelName,
              slug: model.modelSlug,
              source: "METERAPP_VEHICLE_DB",
              sourceIdentifier: `meterapp:${model.modelIdentifier}`,
            },
          ]
        : [];
    });
    for (const batch of chunks(modelRows, 500)) {
      await db.insert(vehicleModels).values(batch).onConflictDoNothing();
    }

    const databaseModels = databaseMakes.length
      ? await db
          .select({
            id: vehicleModels.id,
            makeId: vehicleModels.makeId,
            slug: vehicleModels.slug,
          })
          .from(vehicleModels)
          .where(inArray(vehicleModels.makeId, databaseMakes.map((make) => make.id)))
      : [];
    const modelIdByKey = new Map(
      databaseModels.map((model) => [`${model.makeId}:${model.slug}`, model.id]),
    );
    const makeIdByModelId = new Map(
      databaseModels.map((model) => [model.id, model.makeId]),
    );

    const yearRows = [...modelsByKey.values()].flatMap((model) => {
      const makeId = makeIdBySlug.get(model.makeSlug);
      const modelId = makeId
        ? modelIdByKey.get(`${makeId}:${model.modelSlug}`)
        : undefined;
      return modelId
        ? [...model.years].map((year) => ({ modelId, year }))
        : [];
    });
    for (const batch of chunks(yearRows, 500)) {
      await db.insert(vehicleYears).values(batch).onConflictDoNothing();
    }

    const importedModelIds = [...new Set(yearRows.map((row) => row.modelId))];
    const databaseYears = importedModelIds.length
      ? await db
          .select({ id: vehicleYears.id, modelId: vehicleYears.modelId })
          .from(vehicleYears)
          .where(inArray(vehicleYears.modelId, importedModelIds))
      : [];
    const baseFitments = databaseYears.flatMap((year) => {
      const makeId = makeIdByModelId.get(year.modelId);
      return makeId
        ? [{ makeId, modelId: year.modelId, yearId: year.id }]
        : [];
    });
    for (const batch of chunks(baseFitments, 500)) {
      await db.insert(vehicleFitments).values(batch).onConflictDoNothing();
    }

    console.log(
      `Vehicle import complete: ${makeRows.length} makes, ${modelRows.length} models, ${yearRows.length} model-years, and ${baseFitments.length} base fitments from ${getDataSources().length} documented sources.`,
    );
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error("International vehicle catalogue import failed.");
  console.error(error instanceof Error ? error.message : "Unknown import error");
  process.exitCode = 1;
});
