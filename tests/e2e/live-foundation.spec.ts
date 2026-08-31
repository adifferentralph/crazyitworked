import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

import { createClient } from "@supabase/supabase-js";
import { config as loadEnvironment } from "dotenv";
import postgres, { type Sql } from "postgres";
import { z } from "zod";

import { expect, test, type Page } from "@playwright/test";
import type { Database } from "@/lib/supabase/database.types";

test.use({ actionTimeout: 120_000, navigationTimeout: 120_000 });

loadEnvironment({ path: ".env.local" });

const environment = z
  .object({
    DATABASE_URL: z.string().url().startsWith("postgresql://"),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  })
  .parse(process.env);

type TestAccount = {
  email: string;
  id: string;
  password: string;
};

function createPublicClient() {
  return createClient<Database>(
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
}

async function createAccount(
  role: "BUYER" | "SELLER",
  suffix: string,
  sql: Sql,
): Promise<TestAccount> {
  const id = randomUUID();
  const email = `foundation-${role.toLowerCase()}-${suffix}@gmail.com`;
  const password = `Ttp!${randomUUID()}Aa9`;
  const metadata = {
    full_name: role === "BUYER" ? "Foundation Buyer" : "Foundation Seller",
    requested_role: role,
    ...(role === "SELLER"
      ? { store_name: `Foundation Parts ${suffix}` }
      : {}),
  };

  await sql`
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000'::uuid,
      ${id}::uuid,
      'authenticated',
      'authenticated',
      ${email},
      crypt(${password}, gen_salt('bf')),
      now(),
      '',
      '',
      '',
      '',
      ${sql.json({ provider: "email", providers: ["email"] })},
      ${sql.json(metadata)},
      now(),
      now()
    )
  `;

  await sql`
    insert into auth.identities (
      provider_id, user_id, identity_data, provider, created_at, updated_at
    ) values (
      ${id},
      ${id}::uuid,
      ${sql.json({
        email,
        email_verified: true,
        phone_verified: false,
        sub: id,
      })},
      'email',
      now(),
      now()
    )
  `;

  return { email, id, password };
}

async function waitForProfile(sql: Sql, account: TestAccount, expectedRole: "BUYER" | "SELLER") {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const rows = await sql<{ email: string; role: string }[]>`
      select email, role::text
      from public.profiles
      where id = ${account.id}::uuid
    `;

    if (rows[0]) {
      expect(rows[0].email).toBe(account.email);
      expect(rows[0].role).toBe(expectedRole);
      return;
    }

    await delay(250);
  }

  throw new Error(`Timed out waiting for ${expectedRole} profile trigger.`);
}

async function loginThroughUi(
  page: Page,
  account: TestAccount,
  requestedPath?: string,
) {
  const loginPath = requestedPath
    ? `/login?next=${encodeURIComponent(requestedPath)}`
    : "/login";
  await page.goto(loginPath);
  await page.getByLabel("Email address").fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

async function signOutThroughUi(page: Page) {
  const button = page.getByRole("button", { name: "Sign Out" });
  if (!(await button.isVisible())) {
    await page.locator("header summary").first().click();
  }
  await expect(button).toBeVisible();
  await button.click();
}

test("live Supabase sessions, role routing, and direct RLS boundaries", async ({ page }, testInfo) => {
  test.skip(
    process.env.RUN_LIVE_SUPABASE_TESTS !== "1" || testInfo.project.name !== "chromium",
    "Live Supabase verification runs explicitly and only once.",
  );
  test.setTimeout(900_000);

  const sql = postgres(environment.DATABASE_URL, { max: 1, prepare: false });
  const staleUserIds = (
    await sql<{ id: string }[]>`
      select id::text
      from auth.users
      where email like 'foundation-%@gmail.com'
    `
  ).map((row) => row.id);
  if (staleUserIds.length > 0) {
    await sql`delete from auth.users where id in ${sql(staleUserIds)}`;
  }
  const createdUserIds: string[] = [];
  const suffix = `${Date.now().toString(36)}${randomUUID().slice(0, 4)}`;

  try {
    const buyer = await createAccount("BUYER", suffix, sql);
    createdUserIds.push(buyer.id);


    const seller = await createAccount("SELLER", suffix, sql);
    createdUserIds.push(seller.id);

    await waitForProfile(sql, buyer, "BUYER");
    await waitForProfile(sql, seller, "SELLER");

    const [buyerProfile, sellerProfile] = await Promise.all([
      sql`select user_id from public.buyer_profiles where user_id = ${buyer.id}::uuid`,
      sql`select user_id, status::text from public.seller_profiles where user_id = ${seller.id}::uuid`,
    ]);
    expect(buyerProfile).toHaveLength(1);
    expect(sellerProfile).toHaveLength(1);
    expect(sellerProfile[0]?.status).toBe("PENDING_VERIFICATION");


    await sql`
      update auth.users
      set email_confirmed_at = coalesce(email_confirmed_at, now()), updated_at = now()
      where id in (${buyer.id}::uuid, ${seller.id}::uuid)
    `;

    await sql`
      insert into public.seller_profiles (user_id, store_name, slug)
      values (${buyer.id}::uuid, 'RLS isolation target', ${`rls-target-${suffix}`})
    `;

    await loginThroughUi(page, buyer, "/seller/dashboard");
    await expect(page).toHaveURL(/\/marketplace$/, { timeout: 120_000 });
    await page.reload();
    await expect(page.getByRole("search").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /cart with 0 items/i })).toBeVisible();
    await expect(page.getByText("For suppliers", { exact: true })).toHaveCount(0);

    await page.goto("/seller/dashboard");
    await expect(page).toHaveURL(/\/forbidden$/, { timeout: 120_000 });
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/forbidden$/, { timeout: 120_000 });

    await page.goto("/reset-password");
    const replacementPassword = `Ttp!${randomUUID()}Bb8`;
    await page.getByLabel("New password", { exact: true }).fill(replacementPassword);
    await page.getByLabel("Confirm new password", { exact: true }).fill(replacementPassword);
    await page.getByRole("button", { name: "Set new password" }).click();
    await expect(page).toHaveURL(/\/login\?message=password-updated$/, { timeout: 120_000 });
    buyer.password = replacementPassword;

    await loginThroughUi(page, buyer);
    await expect(page).toHaveURL(/\/marketplace$/, { timeout: 120_000 });
    await signOutThroughUi(page);
    await expect(page).toHaveURL(/\/login$/, { timeout: 120_000 });
    await page.goto("/account");
    await expect(page).toHaveURL(/\/login\?next=%2Faccount$/, { timeout: 120_000 });

    await page.goto("/forgot-password");
    await page.getByLabel("Email address").fill(buyer.email);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText(/If an account exists for that email/i)).toBeVisible({ timeout: 120_000 });

    const buyerClient = createPublicClient();
    const sellerClient = createPublicClient();
    const buyerSession = await buyerClient.auth.signInWithPassword({
      email: buyer.email,
      password: buyer.password,
    });
    const sellerSession = await sellerClient.auth.signInWithPassword({
      email: seller.email,
      password: seller.password,
    });
    expect(buyerSession.error).toBeNull();
    expect(sellerSession.error).toBeNull();

    const sellerReadingBuyerPrivate = await sellerClient
      .from("buyer_profiles")
      .select("user_id")
      .eq("user_id", buyer.id);
    expect(sellerReadingBuyerPrivate.error).toBeNull();
    expect(sellerReadingBuyerPrivate.data).toEqual([]);

    const sellerUpdatingAnotherSeller = await sellerClient
      .from("seller_profiles")
      .update({ store_name: "Unauthorized store change" })
      .eq("user_id", buyer.id)
      .select("user_id");
    expect(sellerUpdatingAnotherSeller.error).toBeNull();
    expect(sellerUpdatingAnotherSeller.data).toEqual([]);

    const [isolationTarget] = await sql<{ store_name: string }[]>`
      select store_name from public.seller_profiles where user_id = ${buyer.id}::uuid
    `;
    expect(isolationTarget?.store_name).toBe("RLS isolation target");

    const anonymousResponse = await fetch(
      `${environment.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?select=id`,
      {
        headers: { apikey: environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY },
      },
    );
    expect(anonymousResponse.status).toBe(401);

    const roleEscalationResponse = await fetch(
      `${environment.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${buyer.id}`,
      {
        body: JSON.stringify({ role: "ADMIN" }),
        headers: {
          apikey: environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
          authorization: `Bearer ${buyerSession.data.session!.access_token}`,
          "content-type": "application/json",
          prefer: "return=representation",
        },
        method: "PATCH",
      },
    );
    expect(roleEscalationResponse.status).toBe(403);

    await loginThroughUi(page, seller, "/account");
    await expect(page).toHaveURL(/\/seller\/dashboard$/, { timeout: 120_000 });
    await page.reload();
    await expect(page.getByRole("navigation", { name: "Seller workspace" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Add Product", exact: true })).toBeVisible();
    await page.goto("/account");
    await expect(page).toHaveURL(/\/forbidden$/, { timeout: 120_000 });
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/forbidden$/, { timeout: 120_000 });
    await page.goto("/seller/dashboard");
    await signOutThroughUi(page);

    await sql.begin(async (transaction) => {
      await transaction`delete from public.seller_profiles where user_id = ${buyer.id}::uuid`;
      await transaction`update public.profiles set role = 'ADMIN' where id = ${buyer.id}::uuid`;
      await transaction`
        insert into public.admin_profiles (user_id, admin_role_id)
        select ${buyer.id}::uuid, id from public.admin_roles where key = 'SUPER_ADMIN'
      `;
    });

    await loginThroughUi(page, buyer, "/seller/dashboard");
    await expect(page).toHaveURL(/\/admin$/, { timeout: 120_000 });
    await page.goto("/account");
    await expect(page).toHaveURL(/\/forbidden$/, { timeout: 120_000 });
    await page.goto("/seller/dashboard");
    await expect(page).toHaveURL(/\/forbidden$/, { timeout: 120_000 });
  } finally {
    if (createdUserIds.length > 0) {
      await sql`delete from auth.users where id in ${sql(createdUserIds)}`;
    }
    await sql.end();
  }
});
