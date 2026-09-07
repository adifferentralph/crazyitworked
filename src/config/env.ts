import { z } from "zod";

import { siteConfig } from "@/config/site";

const developmentAppUrl = "http://localhost:3000";

function getDefaultAppUrl() {
  return process.env.NODE_ENV === "production" ? siteConfig.url : developmentAppUrl;
}

const vapidPublicKeySchema = z
  .string()
  .trim()
  .min(40)
  .max(200)
  .regex(/^[A-Za-z0-9_-]+$/, "VAPID public key must use URL-safe base64.");

const publicEnvironmentSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default(getDefaultAppUrl()),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
});

const databaseEnvironmentSchema = z.object({
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
});

const pushServerEnvironmentSchema = z.object({
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: vapidPublicKeySchema,
  VAPID_PRIVATE_KEY: z.string().trim().min(20).max(200),
  VAPID_SUBJECT: z
    .string()
    .trim()
    .regex(/^(mailto:.+@.+|https:\/\/.+)$/, "VAPID subject must be a mailto: or HTTPS URL."),
});

export function hasSupabaseEnvironment() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export function hasPushEnvironment() {
  return pushServerEnvironmentSchema.safeParse({
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
    VAPID_SUBJECT: process.env.VAPID_SUBJECT,
  }).success;
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

export function getPushPublicKey() {
  const result = vapidPublicKeySchema.safeParse(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
  return result.success ? result.data : null;
}

export function getPushServerEnvironment() {
  return pushServerEnvironmentSchema.parse({
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
    VAPID_SUBJECT: process.env.VAPID_SUBJECT,
  });
}

export function getAppUrl() {
  const value = process.env.NEXT_PUBLIC_APP_URL ?? getDefaultAppUrl();
  return new URL(value).origin;
}
