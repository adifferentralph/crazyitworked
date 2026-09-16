import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getAuthCookieOptions, getPublicEnvironment, hasSupabaseEnvironment } from "@/config/env";
import { normalizeRequestHostname } from "@/lib/routing/vendor";
import type {
  AccountStatus,
  Database,
  UserRole,
} from "@/lib/supabase/database.types";

export type MiddlewarePrincipal = {
  role: UserRole;
  status: AccountStatus;
};

function createResponse(request: NextRequest) {
  return NextResponse.next({ request });
}

export async function updateSession(request: NextRequest) {
  let response = createResponse(request);

  if (!hasSupabaseEnvironment()) {
    return { principal: null, response, userId: null };
  }

  const environment = getPublicEnvironment();
  const hostname = normalizeRequestHostname(
    request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
  );
  const supabase = createServerClient<Database>(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookieOptions: getAuthCookieOptions(hostname),
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = createResponse(request);
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { data, error } = await supabase.auth.getClaims();
  const userId = !error && typeof data?.claims?.sub === "string" ? data.claims.sub : null;

  if (!userId) {
    return { principal: null, response, userId: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", userId)
    .maybeSingle();

  const principal: MiddlewarePrincipal | null = profile
    ? { role: profile.role, status: profile.status }
    : null;

  return { principal, response, userId };
}
