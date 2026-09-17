import { config } from "dotenv";
import postgres from "postgres";
import { z } from "zod";

config({ path: ".env.local" });

const environment = z
  .object({
    DATABASE_URL: z.string().url().startsWith("postgresql://"),
  })
  .parse(process.env);

const requiredMakes = [
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

const requiredModels = [
  ["Toyota", "Camry"],
  ["Toyota", "Highlander"],
  ["Honda", "Accord"],
  ["Mercedes-Benz", "C-Class"],
  ["Mercedes-Benz", "E-Class"],
  ["Peugeot", "206"],
  ["Peugeot", "307"],
  ["Peugeot", "406"],
  ["Peugeot", "508"],
] as const;

type CoverageRow = {
  make: string;
  maxYear: number | null;
  minYear: number | null;
  models: number;
  years: number;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const sql = postgres(environment.DATABASE_URL, { max: 1, prepare: false });

  try {
    const [totals] = await sql<
      {
        duplicateBaseFitments: number;
        engines: number;
        fitments: number;
        generations: number;
        makes: number;
        models: number;
        trims: number;
        years: number;
      }[]
    >`
      select
        (select count(*)::int from public.vehicle_makes) as makes,
        (select count(*)::int from public.vehicle_models) as models,
        (select count(*)::int from public.vehicle_generations) as generations,
        (select count(*)::int from public.vehicle_years) as years,
        (select count(*)::int from public.vehicle_trims) as trims,
        (select count(*)::int from public.engines) as engines,
        (select count(*)::int from public.vehicle_fitments) as fitments,
        (
          select count(*)::int
          from (
            select make_id, model_id, year_id
            from public.vehicle_fitments
            where generation_id is null
              and trim_id is null
              and engine_id is null
              and transmission_id is null
              and drivetrain_id is null
            group by make_id, model_id, year_id
            having count(*) > 1
          ) duplicate_groups
        ) as "duplicateBaseFitments"
    `;
    assert(totals, "Vehicle catalogue totals query returned no row.");
    console.log("Vehicle catalogue totals:", totals);

    const coverage = await sql<CoverageRow[]>`
      select
        vehicle_makes.name as make,
        count(distinct vehicle_models.id)::int as models,
        count(distinct vehicle_years.id)::int as years,
        min(vehicle_years.year)::int as "minYear",
        max(vehicle_years.year)::int as "maxYear"
      from public.vehicle_makes
      left join public.vehicle_models
        on vehicle_models.make_id = vehicle_makes.id
       and vehicle_models.is_active
      left join public.vehicle_years
        on vehicle_years.model_id = vehicle_models.id
      where lower(vehicle_makes.name) in ${sql(requiredMakes.map((name) => name.toLocaleLowerCase("en")))}
      group by vehicle_makes.name
      order by vehicle_makes.name
    `;
    console.table(coverage);

    const coverageByMake = new Map(
      coverage.map((row) => [row.make.toLocaleLowerCase("en"), row]),
    );
    const missingMakes = requiredMakes.filter(
      (name) => !coverageByMake.has(name.toLocaleLowerCase("en")),
    );
    assert(missingMakes.length === 0, `Missing required makes: ${missingMakes.join(", ")}`);

    const incompleteMakes = requiredMakes.filter((name) => {
      const row = coverageByMake.get(name.toLocaleLowerCase("en"));
      return !row || row.models === 0 || row.years === 0;
    });
    assert(
      incompleteMakes.length === 0,
      `Makes without local model-year coverage: ${incompleteMakes.join(", ")}`,
    );

    const requiredModelRows = await sql<{ make: string; model: string; years: number }[]>`
      select
        vehicle_makes.name as make,
        vehicle_models.name as model,
        count(vehicle_years.id)::int as years
      from public.vehicle_models
      join public.vehicle_makes on vehicle_makes.id = vehicle_models.make_id
      left join public.vehicle_years on vehicle_years.model_id = vehicle_models.id
      where lower(vehicle_makes.name) in ${sql(
        [...new Set(requiredModels.map(([make]) => make.toLocaleLowerCase("en")))],
      )}
      group by vehicle_makes.name, vehicle_models.name
    `;
    const requiredModelKeys = new Set(
      requiredModelRows
        .filter((row) => row.years > 0)
        .map((row) => `${row.make.toLocaleLowerCase("en")}:${row.model.toLocaleLowerCase("en")}`),
    );
    const missingModels = requiredModels.filter(
      ([make, model]) =>
        !requiredModelKeys.has(
          `${make.toLocaleLowerCase("en")}:${model.toLocaleLowerCase("en")}`,
        ),
    );
    assert(
      missingModels.length === 0,
      `Required models lack year coverage: ${missingModels.map(([make, model]) => `${make} ${model}`).join(", ")}`,
    );

    const saab = coverageByMake.get("saab");
    assert(saab && saab.years > 0, "Historic Saab model-year coverage is required.");
    assert(totals.makes >= 100, "Vehicle make catalogue is unexpectedly small.");
    assert(totals.models >= 250, "Vehicle model catalogue is unexpectedly small.");
    assert(totals.years >= 1_000, "Vehicle model-year catalogue is unexpectedly small.");
    assert(totals.fitments >= 1_000, "Local vehicle fitment catalogue is unexpectedly small.");
    assert(totals.duplicateBaseFitments === 0, "Duplicate base vehicle fitments exist.");

    console.log("Vehicle catalogue verification passed:");
    console.log(`- ${totals.makes} makes`);
    console.log(`- ${totals.models} models`);
    console.log(`- ${totals.years} model-years`);
    console.log(`- ${totals.fitments} locally cached fitments`);
    console.log("- 16 required current/global/historic makes have models and years");
    console.log("- required Toyota, Honda, Mercedes-Benz, and Peugeot models have year coverage");
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error("Vehicle catalogue verification failed.");
  console.error(error instanceof Error ? error.message : "Unknown verification error");
  process.exitCode = 1;
});
