import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

import { getAuthCookieOptions, getPublicEnvironment } from "@/config/env";
import type { Database } from "@/lib/supabase/database.types";
import { normalizeRequestHostname } from "@/lib/routing/vendor";

export async function createClient() {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const environment = getPublicEnvironment();
  const hostname = normalizeRequestHostname(
    headerStore.get("x-forwarded-host") ?? headerStore.get("host"),
  );

  return createServerClient<Database>(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookieOptions: getAuthCookieOptions(hostname),
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot write cookies. Middleware refreshes them instead.
          }
        },
      },
    },
  );
}
