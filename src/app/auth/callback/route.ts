import { NextResponse } from "next/server";

import { getAppUrl, hasSupabaseEnvironment } from "@/config/env";
import { getPostAuthDestination } from "@/lib/auth/authorization";
import {
  finalizeOAuthSignupRole,
  getOAuthProvider,
  getOAuthSignupIntent,
} from "@/lib/auth/oauth-role";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");
  const intent = getOAuthSignupIntent(requestUrl.searchParams.get("intent"));

  if (code && hasSupabaseEnvironment()) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    const user = data.user;

    if (!error && user) {
      const provider = getOAuthProvider(user.app_metadata.provider);

      try {
        await finalizeOAuthSignupRole({
          intent,
          provider,
          userId: user.id,
        });
      } catch {
        await supabase.auth.signOut({ scope: "local" });
        return NextResponse.redirect(
          new URL("/login?error=profile", getAppUrl()),
        );
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, status")
        .eq("id", user.id)
        .single();

      if (!profileError && profile?.status === "ACTIVE") {
        const destination = getPostAuthDestination(profile.role, next);
        return NextResponse.redirect(new URL(destination, getAppUrl()));
      }

      await supabase.auth.signOut({ scope: "local" });
      const reason = profile?.status && profile.status !== "ACTIVE"
        ? "restricted"
        : "profile";
      return NextResponse.redirect(
        new URL(`/login?error=${reason}`, getAppUrl()),
      );
    }
  }

  return NextResponse.redirect(
    new URL("/login?error=callback", getAppUrl()),
  );
}
