import "server-only";

import { sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";

export type OAuthProvider = "apple" | "google";
export type OAuthSignupIntent = "BUYER" | "SELLER";

export function getOAuthProvider(value: unknown): OAuthProvider | null {
  return value === "apple" || value === "google" ? value : null;
}

export function getOAuthSignupIntent(value: unknown): OAuthSignupIntent {
  return value === "SELLER" ? "SELLER" : "BUYER";
}

export async function finalizeOAuthSignupRole({
  intent,
  provider,
  userId,
}: {
  intent: OAuthSignupIntent;
  provider: OAuthProvider | null;
  userId: string;
}) {
  if (intent !== "SELLER" || !provider) return false;

  const database = getDatabase();
  const result = await database.execute<{ finalized: boolean }>(sql`
    select public.finalize_new_oauth_seller(
      ${userId}::uuid,
      ${provider}::text
    ) as finalized
  `);

  return result[0]?.finalized === true;
}
