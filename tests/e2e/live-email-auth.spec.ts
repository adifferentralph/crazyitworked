import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

import { createClient } from "@supabase/supabase-js";
import { config as loadEnvironment } from "dotenv";
import postgres from "postgres";
import { z } from "zod";

import { expect, test, type Page } from "@playwright/test";
import type { Database } from "@/lib/supabase/database.types";

loadEnvironment({ path: ".env.local" });

const environmentSchema = z.object({
  BREVO_API_KEY: z.string().min(20),
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
});

type BrevoMessage = {
  date: string;
  email: string;
  subject: string;
  uuid: string;
};

type BrevoMessageList = {
  transactionalEmails?: BrevoMessage[];
};

type BrevoMessageDetail = {
  body?: string;
};

const brevoBaseUrl = "https://api.brevo.com/v3";

function decodeHtmlAttribute(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&#x3D;", "=")
    .replaceAll("&#61;", "=");
}

async function resolveTrackedAuthLink(value: string) {
  let current = value;

  for (let redirectCount = 0; redirectCount < 5; redirectCount += 1) {
    let url: URL;
    try {
      url = new URL(current);
    } catch {
      return null;
    }

    if (url.pathname.includes("/auth/v1/verify")) return url.toString();

    let response: Response;
    try {
      response = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(5_000),
      });
    } catch {
      return null;
    }
    const location = response.headers.get("location");
    if (!location || ![301, 302, 303, 307, 308].includes(response.status)) return null;
    current = new URL(location, url).toString();
  }

  return null;
}

async function waitForAuthLink(
  email: string,
  subject: RegExp,
  notBefore: number,
  brevoApiKey: string,
) {
  const headers = {
    accept: "application/json",
    "api-key": brevoApiKey,
  };
  const query = new URLSearchParams({
    email,
    limit: "20",
    sort: "desc",
  });

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const listResponse = await fetch(`${brevoBaseUrl}/smtp/emails?${query.toString()}`, {
      headers,
    });
    if (!listResponse.ok) {
      throw new Error(`Brevo transactional email listing failed with HTTP ${listResponse.status}.`);
    }

    const result = (await listResponse.json()) as BrevoMessageList;
    const message = (result.transactionalEmails ?? []).find(
      (candidate) =>
        candidate.email.toLowerCase() === email.toLowerCase() &&
        subject.test(candidate.subject) &&
        Date.parse(candidate.date) >= notBefore - 5_000,
    );

    if (message) {
      const detailResponse = await fetch(
        `${brevoBaseUrl}/smtp/emails/${encodeURIComponent(message.uuid)}`,
        { headers },
      );
      if (!detailResponse.ok) {
        throw new Error(
          `Brevo transactional email read failed with HTTP ${detailResponse.status}.`,
        );
      }

      const detail = (await detailResponse.json()) as BrevoMessageDetail;
      const body = decodeHtmlAttribute(detail.body ?? "");
      const hrefLinks = [...body.matchAll(/href=(?:"([^"]+)"|'([^']+)')/gi)].map(
        (match) => match[1] ?? match[2] ?? "",
      );
      const plainLinks = body.match(/https?:\/\/[^\s<>"']+/gi) ?? [];
      const links = [...new Set([...hrefLinks, ...plainLinks])];

      for (const link of links) {
        const authLink = await resolveTrackedAuthLink(link);
        if (authLink) return authLink;
      }

      throw new Error(`Brevo message "${message.subject}" has no Supabase Auth link.`);
    }

    await delay(1_000);
  }

  throw new Error(`Timed out waiting for a Brevo message matching ${subject}.`);
}

async function openAuthLink(page: Page, authLink: string) {
  const response = await fetch(authLink, { redirect: "manual" });
  expect([301, 302, 303, 307, 308]).toContain(response.status);
  const location = response.headers.get("location");
  expect(location, "Supabase verification should return an application callback").toBeTruthy();
  const callback = new URL(location!);
  const testOrigin = process.env.PLAYWRIGHT_BASE_URL;
  if (testOrigin) {
    const replacement = new URL(testOrigin);
    callback.protocol = replacement.protocol;
    callback.hostname = replacement.hostname;
    callback.port = replacement.port;
  }
  await page.goto(callback.toString());
}
test("live confirmation and password recovery use Brevo links", async ({ page }, testInfo) => {
  test.skip(
    process.env.RUN_LIVE_SUPABASE_TESTS !== "1" || testInfo.project.name !== "chromium",
    "Live Supabase email verification runs explicitly and only once.",
  );
  test.setTimeout(600_000);
  const environment = environmentSchema.parse(process.env);

  const suffix = `${Date.now().toString(36)}${randomUUID().slice(0, 5)}`;
  const email = `foundation-email-${suffix}@gmail.com`;
  const password = `Ttp!${randomUUID()}Aa9`;
  const sql = postgres(environment.DATABASE_URL, { max: 1, prepare: false });

  try {
    const signupStartedAt = Date.now();
    await page.goto("/signup");
    await expect(page).toHaveURL(/\/signup\/buyer$/);
    await page.getByLabel("First name").fill("Foundation");
    await page.getByLabel("Last name").fill("Email Buyer");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Phone number (optional)").fill("+234 800 000 0000");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel("Confirm password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel(/I agree to the Terms of Use/i).check();
    await page.getByLabel(/Email me useful product updates/i).check();
    await page.getByRole("button", { name: "Create buyer account" }).click();
    await expect(page).toHaveURL(/\/verify-email\?email=/, { timeout: 120_000 });

    const publicClient = createClient<Database>(
      environment.NEXT_PUBLIC_SUPABASE_URL,
      environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      },
    );
    const unconfirmedLogin = await publicClient.auth.signInWithPassword({ email, password });
    expect(unconfirmedLogin.error?.code).toBe("email_not_confirmed");

    const confirmationLink = await waitForAuthLink(
      email,
      /confirm/i,
      signupStartedAt,
      environment.BREVO_API_KEY,
    );
    await openAuthLink(page, confirmationLink);
    await expect(page).toHaveURL(/\/marketplace$/, { timeout: 120_000 });
    await expect(page.getByRole("search").first()).toBeVisible();

    const [buyerProfile] = await sql<
      {
        fullName: string;
        marketingOptIn: boolean;
        phone: string | null;
      }[]
    >`
      select
        profiles.full_name as "fullName",
        profiles.phone,
        buyer_profiles.marketing_opt_in as "marketingOptIn"
      from auth.users
      join public.profiles on profiles.id = auth.users.id
      join public.buyer_profiles on buyer_profiles.user_id = profiles.id
      where auth.users.email = ${email}
    `;
    expect(buyerProfile).toEqual({
      fullName: "Foundation Email Buyer",
      marketingOptIn: true,
      phone: "+234 800 000 0000",
    });

    await page.reload();
    await expect(page.getByRole("search").first()).toBeVisible();
    await page.getByRole("button", { name: "Open account menu" }).click();
    await page.getByRole("button", { name: "Sign Out" }).click();
    await expect(page).toHaveURL(/\/login$/, { timeout: 120_000 });

    const recoveryStartedAt = Date.now();
    await page.goto("/forgot-password");
    await page.getByLabel("Email address").fill(email);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText(/If an account exists for that email/i)).toBeVisible({
      timeout: 120_000,
    });

    const recoveryLink = await waitForAuthLink(
      email,
      /password|reset/i,
      recoveryStartedAt,
      environment.BREVO_API_KEY,
    );
    await openAuthLink(page, recoveryLink);
    await expect(page).toHaveURL(/\/reset-password$/, { timeout: 120_000 });

    const replacementPassword = `Ttp!${randomUUID()}Bb8`;
    const newPasswordInput = page.getByLabel("New password", { exact: true });
    await newPasswordInput.fill(replacementPassword);
    await expect(newPasswordInput).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Show new password" }).click();
    await expect(newPasswordInput).toHaveAttribute("type", "text");
    await page.getByLabel("Confirm new password", { exact: true }).fill(replacementPassword);
    await page.getByRole("button", { name: "Set new password" }).click();
    await expect(page).toHaveURL(/\/login\?message=password-updated$/, { timeout: 120_000 });

    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(replacementPassword);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/marketplace$/, { timeout: 120_000 });
  } finally {
    await sql`delete from auth.users where email = ${email}`;
    await sql.end();
  }
});
