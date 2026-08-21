import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config as loadEnvironment } from "dotenv";
import postgres, { type Sql } from "postgres";
import { z } from "zod";

import { expect, test, type Page } from "@playwright/test";
import type { Database } from "@/lib/supabase/database.types";

test.use({ actionTimeout: 30_000, navigationTimeout: 60_000 });

loadEnvironment({ path: ".env.local" });

const environment = z.object({
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
}).parse(process.env);

type TestSeller = { email: string; id: string; password: string };

function publicClient() {
  return createClient<Database>(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false } },
  );
}

async function createSeller(suffix: string, label: string): Promise<TestSeller> {
  const client = publicClient();
  const email = `phase2-${label}-${suffix}@gmail.com`;
  const password = `Ttp!${randomUUID()}Aa9`;
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { full_name: `Phase 2 ${label}`, requested_role: "SELLER", store_name: `Phase 2 ${label} Parts` } },
  });
  expect(error).toBeNull();
  expect(data.user?.id).toBeTruthy();
  return { email, id: data.user!.id, password };
}

async function waitForSeller(sql: Sql, seller: TestSeller) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const rows = await sql`select user_id from public.seller_profiles where user_id = ${seller.id}::uuid`;
    if (rows.length === 1) return;
    await delay(250);
  }
  throw new Error("Timed out waiting for seller identity trigger.");
}

async function loginUi(page: Page, seller: TestSeller) {
  await page.goto("/login?next=/seller/dashboard");
  await page.getByLabel("Email address").fill(seller.email);
  await page.getByLabel("Password", { exact: true }).fill(seller.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/seller\/dashboard$/, { timeout: 30_000 });
  await expect(page.getByText("Supplier workspace", { exact: true })).toBeVisible({ timeout: 60_000 });
  const authCookieNames = (await page.context().cookies())
    .map((cookie) => cookie.name)
    .filter((name) => name.startsWith("sb-") && name.includes("auth-token"));
  console.log(`[phase2-live] browser auth cookie chunks: ${authCookieNames.length}`);
  expect(authCookieNames.length).toBeGreaterThan(0);
  await page.reload();
  await expect(page.getByText("Supplier workspace", { exact: true })).toBeVisible({ timeout: 60_000 });
}

function productInsert(sellerId: string, categoryId: string, id = randomUUID()) {
  return {
    brand: "Denso",
    category_id: categoryId,
    city: "Ikeja",
    condition: "USED" as const,
    country: "Nigeria",
    delivery_available: true,
    created_by_user_id: sellerId,
    creation_source: "SELLER" as const,
    description: "A genuine live-test automotive part with a documented condition and exact identifiers.",
    id,
    last_modified_by_user_id: sellerId,
    name: "Phase 2 direct RLS test part",
    pickup_available: true,
    price_minor: 45_000_00,
    quantity: 3,
    seller_id: sellerId,
    sku: `RLS-${id.slice(0, 8)}`,
    slug: `phase2-rls-${id.slice(0, 8)}`,
    state: "Lagos",
  };
}

async function onboardThroughClient(client: SupabaseClient<Database>, sellerId: string) {
  const completedAt = new Date().toISOString();
  const profile = await client.from("seller_profiles").update({
    business_registration_number: "BN-PHASE2-TEST",
    city: "Ikeja",
    contact_phone: "+234 800 000 0000",
    country: "Nigeria",
    description: "A test supplier used to verify live seller ownership and RLS boundaries.",
    onboarding_completed_at: completedAt,
    state: "Lagos",
  }).eq("user_id", sellerId);
  expect(profile.error).toBeNull();
  const verification = await client.from("seller_verifications").update({
    status: "SUBMITTED",
    submitted_at: completedAt,
  }).eq("seller_id", sellerId);
  expect(verification.error).toBeNull();
}

async function deleteTestIdentityData(sql: Sql, userIds: string[]) {
  if (userIds.length === 0) return;
  await sql`delete from public.inventory_transactions where product_id in (select id from public.products where seller_id in ${sql(userIds)})`;
  await sql`delete from public.product_modification_history where product_id in (select id from public.products where seller_id in ${sql(userIds)})`;
  await sql`delete from public.products where seller_id in ${sql(userIds)}`;
  await sql`delete from auth.users where id in ${sql(userIds)}`;
}
test("live seller onboarding, product media, workflow, and ownership RLS", async ({ page }, testInfo) => {
  test.skip(process.env.RUN_LIVE_SUPABASE_TESTS !== "1" || testInfo.project.name !== "chromium", "Live Supabase verification runs explicitly and only once.");
  test.setTimeout(900_000);

  const sql = postgres(environment.DATABASE_URL, { max: 1, prepare: false });
  const createdUserIds: string[] = [];
  let sellerOneClient: SupabaseClient<Database> | null = null;
  let productId: string | null = null;
  let storagePaths: string[] = [];
  const suffix = `${Date.now().toString(36)}${randomUUID().slice(0, 4)}`;

  try {
    const staleUserIds = (await sql<{ id: string }[]>`select id::text from auth.users where email like 'phase2-%'`).map((row) => row.id);
    if (staleUserIds.length > 0) {
      const [staleStorage] = await sql<{ count: number }[]>`select count(*)::int as count from storage.objects where bucket_id = 'product-media' and split_part(name, '/', 1) in ${sql(staleUserIds)}`;
      expect(staleStorage?.count, "stale test media must be removed through Storage before identity cleanup").toBe(0);
      await deleteTestIdentityData(sql, staleUserIds);
    }
    await sql.unsafe('drop policy if exists "phase2_test_media_cleanup" on storage.objects');
    console.log("[phase2-live] stale test identities cleared");
    const sellerOne = await createSeller(suffix, "owner");
    createdUserIds.push(sellerOne.id);
    await delay(61_000);
    const sellerTwo = await createSeller(suffix, "outsider");
    createdUserIds.push(sellerTwo.id);
    await Promise.all([waitForSeller(sql, sellerOne), waitForSeller(sql, sellerTwo)]);
    await sql`update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now()), updated_at = now() where id in (${sellerOne.id}::uuid, ${sellerTwo.id}::uuid)`;
    console.log("[phase2-live] two seller identities created and confirmed");

    const owner = publicClient();
    const outsider = publicClient();
    expect((await owner.auth.signInWithPassword({ email: sellerOne.email, password: sellerOne.password })).error).toBeNull();
    expect((await outsider.auth.signInWithPassword({ email: sellerTwo.email, password: sellerTwo.password })).error).toBeNull();
    sellerOneClient = owner;
    console.log("[phase2-live] direct seller sessions authenticated");

    const [{ data: categories }, { data: fitments }] = await Promise.all([
      owner.from("product_categories").select("id").eq("is_active", true).limit(1),
      owner.from("vehicle_fitments").select("id").limit(1),
    ]);
    const categoryId = categories?.[0]?.id;
    const fitmentId = fitments?.[0]?.id;
    expect(categoryId).toBeTruthy();
    expect(fitmentId).toBeTruthy();

    const incompleteInsert = await owner.from("products").insert(productInsert(sellerOne.id, categoryId!));
    expect(incompleteInsert.error, "incomplete onboarding must be rejected by RLS").not.toBeNull();

    console.log("[phase2-live] starting browser login");
    await loginUi(page, sellerOne);
    console.log("[phase2-live] browser login completed");
    await page.goto("/seller/onboarding");
    await page.getByLabel("Store or business name").fill("Phase 2 Owner Parts");
    await page.getByLabel("Registration number").fill("BN-PHASE2-OWNER");
    await page.getByLabel("Business phone").fill("+234 800 123 4567");
    await page.getByLabel("About your business").fill("We supply traceable automotive service parts and preserve original product media for review.");
    await page.getByLabel("State").fill("Lagos");
    await page.getByLabel("City").fill("Ikeja");
    await page.getByRole("button", { name: "Save and submit for verification" }).click();
    await expect(page).toHaveURL(/\/seller\/dashboard\?message=onboarding-complete$/, { timeout: 30_000 });
    console.log("[phase2-live] owner onboarding completed");

    await onboardThroughClient(outsider, sellerTwo.id);

    const approvedInsert = await owner.from("products").insert({ ...productInsert(sellerOne.id, categoryId!), status: "APPROVED" });
    expect(approvedInsert.error, "seller cannot directly publish a new product").not.toBeNull();

    await page.goto("/seller/products/new");
    await page.getByLabel("Part name").fill("Toyota Camry genuine brake pad set");
    await page.getByLabel("Category").selectOption(categoryId!);
    await page.getByLabel("Condition", { exact: true }).selectOption("USED");
    await page.getByLabel("Brand").fill("Toyota");
    await page.getByLabel("Description").fill("Genuine used Toyota brake pad set inspected for the live seller workflow test. Includes visible markings and packaging evidence.");
    await page.getByLabel("OEM part number").fill("04465-33471");
    await page.getByLabel("Manufacturer part number").fill("TTP-LIVE-04465");
    await page.getByLabel("Your SKU").fill(`LIVE-${suffix}`);
    await page.getByLabel("Cross-reference numbers").fill("04465-07010\nD2424");
    await page.getByLabel("Compatible vehicles").selectOption([fitmentId!]);
    await page.getByLabel("Price (NGN)").fill("45000.00");
    await page.getByLabel("Quantity available").fill("7");
    await page.getByLabel("Actual physical item shown").selectOption("PRIMARY");

    const imageBytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
    for (const label of ["Main product image", "Additional product angle", "Detail image", "Part-number or marking image", "Packaging or verification image"]) {
      await page.getByLabel(label, { exact: true }).setInputFiles({ buffer: imageBytes, mimeType: "image/png", name: `${label.toLowerCase().replaceAll(/[^a-z]+/g, "-")}.png` });
    }
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(page).toHaveURL(/\/seller\/products\/[0-9a-f-]+\?message=draft-created$/, { timeout: 90_000 });
    productId = new URL(page.url()).pathname.split("/").at(-1) ?? null;
    expect(productId).toBeTruthy();
    console.log("[phase2-live] five-image draft created");

    await page.getByRole("link", { name: "Edit product" }).click();
    await page.getByLabel("Part name").fill("Toyota Camry genuine front brake pad set");
    await page.getByLabel("Quantity available").fill("9");
    await page.getByRole("button", { name: "Submit for review", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/seller/products/${productId}\\?message=submitted$`), { timeout: 90_000 });
    console.log("[phase2-live] edited product submitted for review");

    const [databaseProduct] = await sql<{ name: string; quantity: number; status: string }[]>`select name, quantity, status::text from public.products where id = ${productId}::uuid`;
    expect(databaseProduct).toMatchObject({ name: "Toyota Camry genuine front brake pad set", quantity: 9, status: "PENDING_REVIEW" });
    const [mediaCount] = await sql<{ count: number }[]>`select count(*)::int as count from public.product_images where product_id = ${productId}::uuid and is_active`;
    expect(mediaCount?.count).toBe(5);
    const [historyCount] = await sql<{ inventory: number; modifications: number }[]>`select (select count(*)::int from public.inventory_transactions where product_id = ${productId}::uuid) as inventory, (select count(*)::int from public.product_modification_history where product_id = ${productId}::uuid) as modifications`;
    expect(historyCount?.inventory).toBeGreaterThanOrEqual(2);
    expect(historyCount?.modifications).toBeGreaterThanOrEqual(3);
    storagePaths = (await sql<{ storage_path: string }[]>`select storage_path from public.product_images where product_id = ${productId}::uuid`).map((row) => row.storage_path);

    const outsiderRead = await outsider.from("products").select("id").eq("id", productId!);
    expect(outsiderRead.error).toBeNull();
    expect(outsiderRead.data).toEqual([]);
    const outsiderUpdate = await outsider.from("products").update({ name: "Unauthorized change" }).eq("id", productId!).select("id");
    expect(outsiderUpdate.error).toBeNull();
    expect(outsiderUpdate.data).toEqual([]);
    const outsiderMedia = await outsider.storage.from("product-media").createSignedUrl(storagePaths[0]!, 60);
    expect(outsiderMedia.error).not.toBeNull();
    const outsiderUpload = await outsider.storage.from("product-media").upload(`${sellerOne.id}/${productId}/${randomUUID()}.png`, imageBytes, { contentType: "image/png" });
    expect(outsiderUpload.error).not.toBeNull();

    const falseAdminMedia = await owner.from("product_images").insert({
      id: randomUUID(),
      is_primary: false,
      mime_type: "image/png",
      original_filename: "false-admin.png",
      position: 99,
      product_id: productId!,
      size_bytes: imageBytes.length,
      source: "ADMIN_REPLACEMENT",
      storage_path: `${sellerOne.id}/${productId}/${randomUUID()}.png`,
      type: "OTHER",
      uploaded_by: sellerOne.id,
    });
    expect(falseAdminMedia.error).not.toBeNull();

    const insufficientId = randomUUID();
    const draftInsert = await outsider.from("products").insert(productInsert(sellerTwo.id, categoryId!, insufficientId));
    expect(draftInsert.error).toBeNull();
    const prematureSubmit = await outsider.from("products").update({ status: "PENDING_REVIEW" }).eq("id", insufficientId);
    expect(prematureSubmit.error?.message).toMatch(/five active required images/i);

    await sql`update public.seller_profiles set status = 'ACTIVE' where user_id = ${sellerOne.id}::uuid`;
    await sql`update public.seller_verifications set status = 'APPROVED', reviewed_at = now() where seller_id = ${sellerOne.id}::uuid`;
    await sql`update public.products set status = 'APPROVED', published_at = now() where id = ${productId}::uuid`;

    const anonymous = publicClient();
    const approvedPublicProduct = await anonymous.from("products").select("id,status,slug").eq("id", productId!).single();
    expect(approvedPublicProduct.error).toBeNull();
    expect(approvedPublicProduct.data?.status).toBe("APPROVED");
    const publicSearch = await anonymous.from("marketplace_product_search").select("product_id,search_text").eq("product_id", productId!).single();
    expect(publicSearch.error).toBeNull();
    expect(publicSearch.data?.search_text).toContain("04465-33471");
    const publicSeller = await anonymous.from("marketplace_sellers").select("seller_id,store_name").eq("seller_id", sellerOne.id).single();
    expect(publicSeller.error).toBeNull();
    expect(publicSeller.data?.store_name).toBe("Phase 2 Owner Parts");
    const publicMedia = await anonymous.storage.from("product-media").createSignedUrl(storagePaths[0]!, 60);
    expect(publicMedia.error).toBeNull();
    const anonymousDraftRead = await anonymous.from("products").select("id").eq("id", insufficientId);
    expect(anonymousDraftRead.error).toBeNull();
    expect(anonymousDraftRead.data).toEqual([]);
    const outsiderApprovedUpdate = await outsider.from("products").update({ name: "Unauthorized approved change" }).eq("id", productId!).select("id");
    expect(outsiderApprovedUpdate.error).toBeNull();
    expect(outsiderApprovedUpdate.data).toEqual([]);

    await page.context().clearCookies();
    await page.goto("/find-a-part?q=04465");
    await expect(page.getByRole("link", { name: /Toyota Camry genuine front brake pad set/i })).toBeVisible({ timeout: 90_000 });
    await Promise.all([
      page.waitForURL(/\/parts\/toyota-camry-genuine-brake-pad-set-/, { timeout: 90_000 }),
      page.getByRole("link", { name: /Toyota Camry genuine front brake pad set/i }).click(),
    ]);
    await expect(page.getByRole("heading", { level: 1, name: "Toyota Camry genuine front brake pad set" })).toBeVisible({ timeout: 90_000 });
    console.log("[phase3-live] approved product, public search, media, and seller projection verified");
  } finally {
    if (productId && storagePaths.length === 0) {
      storagePaths = (
        await sql<{ storage_path: string }[]>`
          select storage_path from public.product_images where product_id = ${productId}::uuid
        `
      ).map((row) => row.storage_path);
    }
    if (sellerOneClient && storagePaths.length > 0) {
      try {
        await sql.unsafe('drop policy if exists "phase2_test_media_cleanup" on storage.objects');
        await sql.unsafe(`create policy "phase2_test_media_cleanup" on storage.objects for delete to authenticated using (bucket_id = 'product-media' and (select auth.uid())::text = (storage.foldername(name))[1] and exists (select 1 from public.products where products.id::text = (storage.foldername(storage.objects.name))[2] and products.seller_id = (select auth.uid()) and products.name like 'Toyota Camry genuine%'))`);
        const cleanup = await sellerOneClient.storage.from("product-media").remove(storagePaths);
        expect(cleanup.error).toBeNull();
      } finally {
        await sql.unsafe('drop policy if exists "phase2_test_media_cleanup" on storage.objects');
      }
    }
    await deleteTestIdentityData(sql, createdUserIds);
    await sql.end();
  }
});
