import { config } from "dotenv";
import { eq, ilike } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { z } from "zod";

import { vehicleMakes, vehicleModels } from "../src/db/schema";
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

const responseSchema = z.object({
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

async function fetchJson(url: string) {
  const response = await fetch(url, {
    headers: { "user-agent": "Twenty-Two Parts vehicle catalogue importer" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error("vPIC request failed with HTTP " + response.status);
  }
  return response.json();
}

function chunks<T>(values: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

async function main() {
  const client = postgres(environment.DATABASE_URL, {
    max: 1,
    prepare: false,
  });
  const db = drizzle({ client });

  try {
    const parsed = responseSchema.parse(
      await fetchJson(
        "https://vpic.nhtsa.dot.gov/api/vehicles/GetAllMakes?format=json",
      ),
    );
    const rows = new Map<
      string,
      {
        isDiscontinued: boolean;
        name: string;
        slug: string;
        source: string;
        sourceIdentifier: string;
      }
    >();

    for (const result of parsed.Results) {
      const name = normalizeMakeName(result.Make_Name);
      const slug =
        slugifyVehicleName(name) || "vpic-make-" + result.Make_ID;
      rows.set(slug, {
        isDiscontinued: discontinuedVehicleMakes.has(name.toLocaleLowerCase("en")),
        name,
        slug,
        source: "NHTSA_VPIC",
        sourceIdentifier: String(result.Make_ID),
      });
    }

    for (const name of regionalVehicleMakeSupplement) {
      const slug = slugifyVehicleName(name);
      if (!rows.has(slug)) {
        rows.set(slug, {
          isDiscontinued: discontinuedVehicleMakes.has(name.toLocaleLowerCase("en")),
          name,
          slug,
          source: "REGIONAL_SUPPLEMENT",
          sourceIdentifier: "regional:" + slug,
        });
      }
    }

    const makeRows = [...rows.values()];
    for (const batch of chunks(makeRows, 500)) {
      await db.insert(vehicleMakes).values(batch).onConflictDoNothing();
    }

    for (const legacyName of discontinuedVehicleMakes) {
      await db
        .update(vehicleMakes)
        .set({ isDiscontinued: true })
        .where(ilike(vehicleMakes.name, legacyName));
    }

    const requestedModelMakes = process.argv
      .find((argument) => argument.startsWith("--model-makes="))
      ?.slice("--model-makes=".length)
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);

    if (requestedModelMakes?.length) {
      for (const requestedName of requestedModelMakes) {
        const normalized = normalizeMakeName(requestedName);
        const imported = makeRows.find(
          (row) =>
            row.name.toLocaleLowerCase("en") ===
            normalized.toLocaleLowerCase("en"),
        );
        if (!imported || imported.source !== "NHTSA_VPIC") {
          console.warn(
            "Skipping models for " + requestedName + ": no vPIC make ID.",
          );
          continue;
        }

        const [databaseMake] = await db
          .select({ id: vehicleMakes.id })
          .from(vehicleMakes)
          .where(eq(vehicleMakes.slug, imported.slug))
          .limit(1);
        if (!databaseMake) {
          throw new Error("Imported make was not found: " + imported.name);
        }

        const models = modelResponseSchema.parse(
          await fetchJson(
            "https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeId/" +
              imported.sourceIdentifier +
              "?format=json",
          ),
        );
        const modelRows = [
          ...new Map(
            models.Results.map((model) => {
              const name = normalizeMakeName(model.Model_Name);
              const slug =
                slugifyVehicleName(name) || "vpic-model-" + model.Model_ID;
              return [
                slug,
                {
                  makeId: databaseMake.id,
                  name,
                  slug,
                  source: "NHTSA_VPIC",
                  sourceIdentifier: String(model.Model_ID),
                },
              ] as const;
            }),
          ).values(),
        ];

        for (const batch of chunks(modelRows, 500)) {
          await db.insert(vehicleModels).values(batch).onConflictDoNothing();
        }
        console.log(
          "Imported " + modelRows.length + " models for " + imported.name + ".",
        );
      }
    }

    console.log(
      "Imported " + makeRows.length + " active vehicle makes into PostgreSQL.",
    );
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error("Vehicle catalogue import failed.");
  console.error(
    error instanceof Error ? error.message : "Unknown import error",
  );
  process.exitCode = 1;
});
