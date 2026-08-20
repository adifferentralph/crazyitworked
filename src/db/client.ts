import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getDatabaseEnvironment } from "@/config/env";
import * as schema from "@/db/schema";

const globalDatabase = globalThis as unknown as {
  twentyTwoPartsPostgres?: ReturnType<typeof postgres>;
};

function createPostgresClient() {
  const { DATABASE_URL } = getDatabaseEnvironment();
  return postgres(DATABASE_URL, {
    prepare: false,
    max: process.env.NODE_ENV === "production" ? 10 : 3,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

export function getDatabase() {
  const client = globalDatabase.twentyTwoPartsPostgres ?? createPostgresClient();

  if (process.env.NODE_ENV !== "production") {
    globalDatabase.twentyTwoPartsPostgres = client;
  }

  return drizzle({ client, schema });
}
