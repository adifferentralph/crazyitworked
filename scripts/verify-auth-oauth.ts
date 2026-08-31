import { config } from "dotenv";
import postgres from "postgres";
import { z } from "zod";

config({ path: ".env.local" });

const environment = z
  .object({
    DATABASE_URL: z.string().url().startsWith("postgresql://"),
  })
  .parse(process.env);

async function main() {
  const database = postgres(environment.DATABASE_URL, {
    max: 1,
    prepare: false,
  });

  try {
    const [result] = await database<{
      anon_execute: boolean;
      authenticated_execute: boolean;
      installed: boolean;
      service_execute: boolean;
    }[]>`
      select
        to_regprocedure(
          'public.finalize_new_oauth_seller(uuid,text)'
        ) is not null as installed,
        has_function_privilege(
          'anon',
          'public.finalize_new_oauth_seller(uuid,text)',
          'EXECUTE'
        ) as anon_execute,
        has_function_privilege(
          'authenticated',
          'public.finalize_new_oauth_seller(uuid,text)',
          'EXECUTE'
        ) as authenticated_execute,
        has_function_privilege(
          'service_role',
          'public.finalize_new_oauth_seller(uuid,text)',
          'EXECUTE'
        ) as service_execute
    `;

    if (
      !result?.installed ||
      result.anon_execute ||
      result.authenticated_execute ||
      result.service_execute
    ) {
      throw new Error(
        "OAuth role finalizer installation or API-role privileges are unsafe.",
      );
    }

    console.log(
      "OAuth role finalizer is installed and inaccessible to API roles.",
    );
  } finally {
    await database.end();
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "OAuth verification failed.",
  );
  process.exitCode = 1;
});
