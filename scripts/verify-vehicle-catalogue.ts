import { config } from "dotenv";
import { count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { z } from "zod";

import { vehicleMakes } from "../src/db/schema";

config({ path: ".env.local" });

const environment = z
  .object({
    DATABASE_URL: z.string().url().startsWith("postgresql://"),
  })
  .parse(process.env);

const requiredMakes = [
  "Toyota",
  "Mercedes-Benz",
  "Peugeot",
  "Ford",
  "Hyundai",
  "Land Rover",
  "BYD",
  "Tata",
  "Volvo",
  "Mitsubishi",
  "Saab",
] as const;

async function main() {
  const client = postgres(environment.DATABASE_URL, {
    max: 1,
    prepare: false,
  });
  const db = drizzle({ client });

  try {
    const [catalogue] = await db
      .select({ total: count() })
      .from(vehicleMakes);
    const rows = await db
      .select({
        isDiscontinued: vehicleMakes.isDiscontinued,
        name: vehicleMakes.name,
      })
      .from(vehicleMakes);
    const found = new Map(
      rows.map((row) => [row.name.toLocaleLowerCase("en"), row]),
    );
    const missing = requiredMakes.filter(
      (name) => !found.has(name.toLocaleLowerCase("en")),
    );
    if (missing.length > 0) {
      throw new Error("Missing required makes: " + missing.join(", "));
    }
    if (!found.get("saab")?.isDiscontinued) {
      throw new Error("Saab must be represented as a historic/discontinued make.");
    }
    if (!catalogue || catalogue.total < 100) {
      throw new Error("Vehicle make catalogue is unexpectedly small.");
    }

    console.log(
      "Vehicle catalogue verified: " +
        catalogue.total +
        " makes; required global and historic coverage is present.",
    );
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error("Vehicle catalogue verification failed.");
  console.error(error instanceof Error ? error.message : "Unknown verification error");
  process.exitCode = 1;
});
