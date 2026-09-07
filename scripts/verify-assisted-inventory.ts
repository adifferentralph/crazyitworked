import { randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import postgres from "postgres";
import { z } from "zod";

import type { Database, ProductImageType } from "@/lib/supabase/database.types";

config({ path: ".env.local" });
const environment = z
  .object({
    DATABASE_URL: z.string().url().startsWith("postgresql://"),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  })
  .parse(process.env);
const sql = postgres(environment.DATABASE_URL, { max: 1, prepare: false });
const userIds: string[] = [];
const storagePaths: string[] = [];
let productId: string | null = null;
let staffClient: SupabaseClient<Database> | null = null;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function publicClient() {
  return createClient<Database>(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false } },
  );
}

async function createPasswordUser(role: "BUYER" | "SELLER", label: string) {
  const id = randomUUID();
  const email = `assisted-${label}-${Date.now()}-${id.slice(0, 4)}@example.com`;
  const password = `Ttp!${randomUUID()}Aa9`;
  const metadata = {
    full_name: `Assisted ${label}`,
    requested_role: role,
    ...(role === "SELLER" ? { store_name: `Assisted ${label} Parts` } : {}),
  };
  await sql`
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000'::uuid, ${id}::uuid, 'authenticated',
      'authenticated', ${email}, crypt(${password}, gen_salt('bf')), now(), '', '', '', '',
      ${sql.json({ provider: "email", providers: ["email"] })}, ${sql.json(metadata)}, now(), now()
    )
  `;
  userIds.push(id);
  await sql`
    insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
    values (${id}, ${id}::uuid, ${sql.json({ email, email_verified: true, phone_verified: false, sub: id })}, 'email', now(), now())
  `;
  return { email, id, password };
}

async function signIn(account: { email: string; password: string }) {
  const client = publicClient();
  const { error } = await client.auth.signInWithPassword(account);
  assert(!error, `Sign in failed: ${error?.message}`);
  return client;
}

async function run() {
  console.log("Creating SMTP-independent live verification identities...");
  const sellerAccount = await createPasswordUser("SELLER", "seller");
  const staffAccount = await createPasswordUser("BUYER", "product-staff");
  const financeAccount = await createPasswordUser("BUYER", "finance-staff");

  const [productRole] = await sql<
    { id: string }[]
  >`select id from public.admin_roles where key = 'PRODUCT_MODERATOR' limit 1`;
  const [financeRole] = await sql<
    { id: string }[]
  >`select id from public.admin_roles where key = 'FINANCE_ADMIN' limit 1`;
  assert(productRole?.id && financeRole?.id, "Seeded admin roles are required.");
  await sql.begin(async (transaction) => {
    await transaction`delete from public.buyer_profiles where user_id in (${staffAccount.id}::uuid, ${financeAccount.id}::uuid)`;
    await transaction`update public.profiles set role = 'ADMIN' where id in (${staffAccount.id}::uuid, ${financeAccount.id}::uuid)`;
    await transaction`insert into public.admin_profiles (user_id, admin_role_id, job_title) values (${staffAccount.id}::uuid, ${productRole.id}::uuid, 'Inventory onboarding tester'), (${financeAccount.id}::uuid, ${financeRole.id}::uuid, 'Finance boundary tester')`;
    await transaction`update public.seller_profiles set status = 'ACTIVE', onboarding_completed_at = now(), state = 'Lagos', city = 'Ikeja' where user_id = ${sellerAccount.id}::uuid`;
  });

  const seller = await signIn(sellerAccount);
  const staff = await signIn(staffAccount);
  staffClient = staff;
  const finance = await signIn(financeAccount);
  const [catalog] = await sql<{ category_id: string; fitment_id: string }[]>`
    select
      (select id from public.product_categories where is_active order by position limit 1) as category_id,
      (select id from public.vehicle_fitments order by created_at limit 1) as fitment_id
  `;
  assert(catalog?.category_id && catalog.fitment_id, "Seeded category and fitment are required.");

  const sellerListing = await seller.rpc("inventory_onboarding_sellers");
  assert(Boolean(sellerListing.error), "Seller accessed the staff seller-selection RPC.");
  const financeListing = await finance.rpc("inventory_onboarding_sellers");
  assert(Boolean(financeListing.error), "Finance-only admin accessed assisted inventory.");
  const staffListing = await staff.rpc("inventory_onboarding_sellers");
  assert(
    !staffListing.error && staffListing.data.some((row) => row.seller_id === sellerAccount.id),
    "Authorized staff could not select the seller.",
  );

  const directStaffInsert = await staff.from("products").insert({
    brand: "Blocked",
    category_id: catalog.category_id,
    city: "Ikeja",
    condition: "NEW",
    created_by_user_id: staffAccount.id,
    delivery_available: true,
    description: "Direct staff table insert must remain blocked by seller-only RLS.",
    last_modified_by_user_id: staffAccount.id,
    name: "Blocked direct insert",
    pickup_available: true,
    price_minor: 100_00,
    quantity: 1,
    seller_id: sellerAccount.id,
    sku: `BLOCK-${randomUUID().slice(0, 8)}`,
    slug: `blocked-${randomUUID().slice(0, 8)}`,
    state: "Lagos",
  });
  assert(
    Boolean(directStaffInsert.error),
    "Staff bypassed the assisted product RPC with a direct insert.",
  );

  const productUuid = randomUUID();
  const created = await staff.rpc("create_assisted_product_draft", {
    p_brand: "Toyota",
    p_category_id: catalog.category_id,
    p_city: "Ikeja",
    p_condition: "NEW",
    p_creation_source: "PLATFORM_ASSISTED",
    p_cross_references: ["04465-07010"],
    p_delivery_available: true,
    p_description:
      "Live assisted inventory verification part with seller-owned provenance and genuine test images.",
    p_fitment_ids: [catalog.fitment_id],
    p_manufacturer_part_number: "TTP-ASSIST-001",
    p_name: "Assisted Toyota brake pad set",
    p_oem_part_number: "04465-06140",
    p_pickup_available: true,
    p_price_minor: 45_000_00,
    p_quantity: 8,
    p_seller_id: sellerAccount.id,
    p_sku: `ASSIST-${productUuid.slice(0, 8)}`,
    p_slug: `assisted-brake-pad-${productUuid.slice(0, 8)}`,
    p_state: "Lagos",
  });
  assert(
    !created.error && created.data,
    `Assisted draft creation failed: ${created.error?.message}`,
  );
  productId = created.data;

  const [stored] = await sql<
    { assisted: boolean; created_by: string; seller_id: string; source: string }[]
  >`
    select assisted_onboarding as assisted, created_by_user_id as created_by, seller_id, creation_source::text as source
    from public.products where id = ${productId}::uuid
  `;
  assert(
    stored?.seller_id === sellerAccount.id,
    "Assisted product ownership was not assigned to seller.",
  );
  assert(
    stored.created_by === staffAccount.id &&
      stored.assisted &&
      stored.source === "PLATFORM_ASSISTED",
    "Product provenance is incorrect.",
  );
  const staffDirectRead = await staff.from("products").select("id").eq("id", productId);
  assert(
    !staffDirectRead.error && staffDirectRead.data.length === 0,
    "Staff received broad direct product-table read access.",
  );
  const operationalRead = await staff.rpc("inventory_onboarding_products");
  assert(
    !operationalRead.error && operationalRead.data.some((item) => item.product_id === productId),
    "Scoped operational product read failed.",
  );
  const sellerRead = await seller
    .from("products")
    .select("id,creation_source")
    .eq("id", productId)
    .single();
  assert(
    !sellerRead.error && sellerRead.data?.creation_source === "PLATFORM_ASSISTED",
    "Owning seller could not read assisted draft.",
  );

  const image = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  );
  const imageTypes: ProductImageType[] = ["PRIMARY", "ANGLE", "DETAIL", "PART_NUMBER", "PACKAGING"];
  for (const [index, type] of imageTypes.entries()) {
    const path = `${sellerAccount.id}/${productId}/${randomUUID()}.png`;
    const upload = await staff.storage
      .from("product-media")
      .upload(path, image, { contentType: "image/png", upsert: false });
    assert(!upload.error, `Authorized staff image upload failed: ${upload.error?.message}`);
    storagePaths.push(path);
    const registered = await staff.rpc("register_assisted_product_image", {
      p_is_actual_item: index === 0,
      p_mime_type: "image/png",
      p_original_filename: `${type.toLowerCase()}.png`,
      p_product_id: productId,
      p_size_bytes: image.length,
      p_storage_path: path,
      p_type: type,
    });
    assert(!registered.error, `Assisted image registration failed: ${registered.error?.message}`);
  }

  const financeUpload = await finance.storage
    .from("product-media")
    .upload(`${sellerAccount.id}/${productId}/${randomUUID()}.png`, image, {
      contentType: "image/png",
    });
  assert(Boolean(financeUpload.error), "Finance-only admin uploaded assisted product media.");
  const confirmed = await seller.rpc("confirm_assisted_product", { p_product_id: productId });
  assert(!confirmed.error, `Seller confirmation failed: ${confirmed.error?.message}`);
  const [confirmedProduct] = await sql<{ acknowledged: string | null; status: string }[]>`
    select seller_acknowledged_at as acknowledged, status::text from public.products where id = ${productId}::uuid
  `;
  assert(
    confirmedProduct?.acknowledged && confirmedProduct.status === "PENDING_REVIEW",
    "Seller confirmation did not submit for moderation.",
  );

  const provenanceChange = await seller
    .from("products")
    .update({ creation_source: "SELLER" })
    .eq("id", productId);
  assert(Boolean(provenanceChange.error), "Seller changed immutable assisted-listing provenance.");

  const importWrite = await staff.from("inventory_imports").insert({
    created_by_user_id: staffAccount.id,
    file_name: "live-assisted.csv",
    file_sha256: "a".repeat(64),
    seller_id: sellerAccount.id,
    status: "READY",
    total_rows: 1,
    valid_rows: 1,
  });
  assert(
    !importWrite.error,
    `Authorized import history write failed: ${importWrite.error?.message}`,
  );
  const sellerImports = await seller.from("inventory_imports").select("id");
  assert(
    !sellerImports.error && sellerImports.data.length === 0,
    "Seller accessed staff import history.",
  );
  const financeImports = await finance.from("inventory_imports").select("id");
  assert(
    !financeImports.error && financeImports.data.length === 0,
    "Finance-only admin accessed import history.",
  );

  console.log(
    "Live assisted inventory ownership, permission, media, seller confirmation, and RLS checks passed.",
  );
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      if (productId)
        await sql`update public.products set status = 'DRAFT', seller_acknowledged_at = null where id = ${productId}::uuid`;
      if (staffClient && storagePaths.length)
        await staffClient.storage.from("product-media").remove(storagePaths);
      if (productId) {
        await sql`delete from public.inventory_transactions where product_id = ${productId}::uuid`;
        await sql`delete from public.product_modification_history where product_id = ${productId}::uuid`;
        await sql`delete from public.products where id = ${productId}::uuid`;
      }
      if (userIds.length) {
        await sql`delete from public.fitment_claim_history where seller_id in ${sql(userIds)}`;
      }
      if (userIds.length) {
        await sql`delete from public.inventory_imports where created_by_user_id in ${sql(userIds)}`;
        await sql`delete from auth.users where id in ${sql(userIds)}`;
      }
    } finally {
      await sql.end();
    }
  });
