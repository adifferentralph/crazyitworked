import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import {
  getPublicEnvironment,
  hasSupabaseEnvironment,
} from "@/config/env";
import type { Database } from "@/lib/supabase/database.types";

function createResponse(request: NextRequest) {
  return NextResponse.next({ request });
}

export async function updateSession(request: NextRequest) {
  let response = createResponse(request);

  if (!hasSupabaseEnvironment()) {
    return { response, userId: null };
  }

  const environment = getPublicEnvironment();
  const supabase = createServerClient<Database>(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = createResponse(request);
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { data, error } = await supabase.auth.getClaims();
  const userId =
    !error && typeof data?.claims?.sub === "string"
      ? data.claims.sub
      : null;

  return { response, userId };
}
