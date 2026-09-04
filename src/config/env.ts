import { z } from "zod";

import { siteConfig } from "@/config/site";

const developmentAppUrl = "http://localhost:3000";

function getDefaultAppUrl() {
  return process.env.NODE_ENV === "production" ? siteConfig.url : developmentAppUrl;
}

const publicEnvironmentSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default(getDefaultAppUrl()),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
});

const databaseEnvironmentSchema = z.object({
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
});

export function hasSupabaseEnvironment() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export function getPublicEnvironment() {
  return publicEnvironmentSchema.parse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

export function getDatabaseEnvironment() {
  return databaseEnvironmentSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
  });
}

export function getAppUrl() {
  const value = process.env.NEXT_PUBLIC_APP_URL ?? getDefaultAppUrl();
  return new URL(value).origin;
}
