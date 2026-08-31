import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

import { createClient } from "@supabase/supabase-js";
import { config as loadEnvironment } from "dotenv";
import postgres from "postgres";
import { z } from "zod";

import { expect, test, type Page } from "@playwright/test";
import type { Database } from "@/lib/supabase/database.types";

loadEnvironment({ path: ".env.local" });

const environment = z
  .object({
    DATABASE_URL: z.string().url().startsWith("postgresql://"),
    MAILTRAP_ACCOUNT_ID: z.string().regex(/^\d+$/),
    MAILTRAP_API_TOKEN: z.string().min(20),
    MAILTRAP_INBOX_ID: z.string().regex(/^\d+$/),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  })
  .parse(process.env);

type MailtrapMessage = {
  created_at: string;
  html_path: string;
  id: number;
  subject: string;
  to_email: string | string[];
};

const mailtrapBaseUrl =
  `https://mailtrap.io/api/accounts/${environment.MAILTRAP_ACCOUNT_ID}/inboxes/${environment.MAILTRAP_INBOX_ID}`;

function decodeHtmlAttribute(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&#x3D;", "=")
    .replaceAll("&#61;", "=");
}

function includesRecipient(message: MailtrapMessage, email: string) {
  const recipients = Array.isArray(message.to_email) ? message.to_email : [message.to_email];
  return recipients.some((recipient) => recipient.toLowerCase() === email.toLowerCase());
}

async function waitForAuthLink(email: string, subject: RegExp, notBefore: number) {
  const headers = { "Api-Token": environment.MAILTRAP_API_TOKEN };

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const listResponse = await fetch(`${mailtrapBaseUrl}/messages?page=1`, {
      headers,
    });
    if (!listResponse.ok) {
      throw new Error(
        `Mailtrap message listing failed with HTTP ${listResponse.status}.`,
      );
    }

    const messages = (await listResponse.json()) as MailtrapMessage[];
    const message = messages.find(
      (candidate) =>
        includesRecipient(candidate, email) &&
        subject.test(candidate.subject) &&
        Date.parse(candidate.created_at) >= notBefore - 5_000,
    );

    if (message) {
      const detailResponse = await fetch(
        `${mailtrapBaseUrl}/messages/${message.id}`,
        { headers },
      );
      if (!detailResponse.ok) {
        throw new Error(
          `Mailtrap message read failed with HTTP ${detailResponse.status}.`,
        );
      }

      const detail = (await detailResponse.json()) as MailtrapMessage;
      const bodyResponse = await fetch(new URL(detail.html_path, "https://mailtrap.io"), {
        headers,
      });
      if (!bodyResponse.ok) {
        throw new Error(
          `Mailtrap message body read failed with HTTP ${bodyResponse.status}.`,
        );
      }

      const html = await bodyResponse.text();
      const links = [...html.matchAll(/href=(?:"([^"]+)"|'([^']+)')/gi)].map((match) =>
        decodeHtmlAttribute(match[1] ?? match[2] ?? ""),
      );
      const authLink = links.find((link) => {
        try {
          return new URL(link).pathname.includes("/auth/v1/verify");
        } catch {
          return false;
        }
      });

      if (!authLink) {
        throw new Error(
          `Mailtrap message "${message.subject}" has no Supabase Auth link.`,
        );
      }

      return authLink;
    }

    await delay(500);
  }

  throw new Error(`Timed out waiting for Mailtrap message matching ${subject}.`);
}

async function openAuthLink(page: Page, authLink: string) {
  const response = await fetch(authLink, { redirect: "manual" });
  expect([301, 302, 303, 307, 308]).toContain(response.status);
  const location = response.headers.get("location");
  expect(location, "Supabase verification should return an application callback").toBeTruthy();
  const callback = new URL(location!);
  const testOrigin = process.env.PLAYWRIGHT_BASE_URL;
  if (testOrigin && ["localhost", "127.0.0.1"].includes(callback.hostname)) {
    const replacement = new URL(testOrigin);
    callback.protocol = replacement.protocol;
    callback.hostname = replacement.hostname;
    callback.port = replacement.port;
  }
  await page.goto(callback.toString());
}
test("live confirmation and password recovery use Mailtrap links", async ({ page }, testInfo) => {
  test.skip(
    process.env.RUN_LIVE_SUPABASE_TESTS !== "1" || testInfo.project.name !== "chromium",
    "Live Supabase email verification runs explicitly and only once.",
  );
  test.setTimeout(600_000);

  const suffix = `${Date.now().toString(36)}${randomUUID().slice(0, 5)}`;
  const email = `foundation-email-${suffix}@gmail.com`;
  const password = `Ttp!${randomUUID()}Aa9`;
  const sql = postgres(environment.DATABASE_URL, { max: 1, prepare: false });

  try {
    const signupStartedAt = Date.now();
    await page.goto("/signup/buyer");
    await page.getByLabel("Full name").fill("Foundation Email Buyer");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel("Confirm password", { exact: true }).fill(password);
    await page.getByLabel(/I agree to the Terms of Use/i).check();
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

    const confirmationLink = await waitForAuthLink(email, /confirm/i, signupStartedAt);
    await openAuthLink(page, confirmationLink);
    await expect(page).toHaveURL(/\/marketplace$/, { timeout: 120_000 });
    await expect(page.getByRole("search").first()).toBeVisible();
    await page.reload();
    await expect(page.getByRole("search").first()).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/, { timeout: 120_000 });

    const recoveryStartedAt = Date.now();
    await page.goto("/forgot-password");
    await page.getByLabel("Email address").fill(email);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText(/If an account exists for that email/i)).toBeVisible({ timeout: 120_000 });

    const recoveryLink = await waitForAuthLink(email, /password|reset/i, recoveryStartedAt);
    await openAuthLink(page, recoveryLink);
    await expect(page).toHaveURL(/\/reset-password$/, { timeout: 120_000 });

    const replacementPassword = `Ttp!${randomUUID()}Bb8`;
    const newPasswordInput = page.getByLabel("New password", { exact: true });
    await newPasswordInput.fill(replacementPassword);
    await expect(newPasswordInput).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Show new password" }).click();
    await expect(newPasswordInput).toHaveAttribute("type", "text");
    await page
      .getByLabel("Confirm new password", { exact: true })
      .fill(replacementPassword);
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