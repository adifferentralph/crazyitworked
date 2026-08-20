import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { z } from "zod";

config({ path: ".env.local" });

const environment = z
  .object({
    DATABASE_URL: z.string().url().startsWith("postgresql://"),
  })
  .parse(process.env);

async function main() {
  const client = postgres(environment.DATABASE_URL, {
    max: 1,
    prepare: false,
  });

  try {
    await migrate(drizzle({ client }), { migrationsFolder: "drizzle" });
    console.log("Database migrations completed.");
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error("Database migration failed.");
  console.error(error instanceof Error ? error.message : "Unknown migration error");
  process.exitCode = 1;
});
