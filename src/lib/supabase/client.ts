"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getAuthCookieOptions, getPublicEnvironment } from "@/config/env";
import type { Database } from "@/lib/supabase/database.types";

export function createClient() {
  const environment = getPublicEnvironment();
  const hostname = typeof window === "undefined" ? null : window.location.hostname;

  return createBrowserClient<Database>(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { cookieOptions: getAuthCookieOptions(hostname) },
  );
}
