import { randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import postgres from "postgres";
import { z } from "zod";

import type { Database, FitmentOutcomeStatus } from "@/lib/supabase/database.types";

config({ path: ".env.local" });
const environment = z.object({
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
}).parse(process.env);
const sql = postgres(environment.DATABASE_URL, { max: 1, prepare: false });
const userIds: string[] = [];
const snapshotIds: string[] = [];
const demandTokens: string[] = [];
let productId: string | null = null;
let requestId: string | null = null;
let quoteId: string | null = null;

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
  const email = `fitment-${label}-${Date.now()}-${id.slice(0, 4)}@example.com`;
  const password = `Ttp!${randomUUID()}Aa9`;
  const metadata = {
    full_name: `Fitment ${label}`,
    requested_role: role,
    ...(role === "SELLER" ? { store_name: `Fitment ${label} Parts` } : {}),
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

async function insertEligibleSnapshot(buyerId: string, sellerId: string, fitmentId: string, categoryId: string) {
  const id = randomUUID();
  const referenceId = randomUUID();
  await sql`
    insert into public.fitment_transaction_snapshots (
      id, source, source_reference_id, buyer_id, seller_id, product_id, fitment_id,
      category_id, product_snapshot, vehicle_snapshot, eligible_at, fulfilled_at
    ) values (
      ${id}::uuid, 'CATALOG_ORDER', ${referenceId}::uuid, ${buyerId}::uuid,
      ${sellerId}::uuid, ${productId}::uuid, ${fitmentId}::uuid, ${categoryId}::uuid,
      ${sql.json({ name: "Live fitment verification part", oemPartNumber: "TTP-FIT-001" })},
      ${sql.json({ make: "Test make", model: "Test model", year: 2020, fitmentId })},
      now(), now()
    )
  `;
  snapshotIds.push(id);
  return id;
}

async function submitOutcome(client: SupabaseClient<Database>, snapshotId: string, outcome: FitmentOutcomeStatus) {
  const result = await client.rpc("submit_fitment_outcome", {
    p_note: `Live ${outcome.toLowerCase()} evidence`,
    p_outcome: outcome,
    p_snapshot_id: snapshotId,
  });
  assert(!result.error, `Fitment outcome ${outcome} failed: ${result.error?.message}`);
}

async function run() {
  console.log("Creating SMTP-independent fitment verification identities...");
  const buyerAccount = await createPasswordUser("BUYER", "buyer");
  const otherBuyerAccount = await createPasswordUser("BUYER", "other-buyer");
  const sellerAccount = await createPasswordUser("SELLER", "seller");
  const staffAccount = await createPasswordUser("BUYER", "product-staff");
  const financeAccount = await createPasswordUser("BUYER", "finance-staff");

  const [productRole] = await sql<{ id: string }[]>`select id from public.admin_roles where key = 'PRODUCT_MODERATOR' limit 1`;
  const [financeRole] = await sql<{ id: string }[]>`select id from public.admin_roles where key = 'FINANCE_ADMIN' limit 1`;
  assert(productRole?.id && financeRole?.id, "Seeded admin roles are required.");
  await sql.begin(async (transaction) => {
    await transaction`delete from public.buyer_profiles where user_id in (${staffAccount.id}::uuid, ${financeAccount.id}::uuid)`;
    await transaction`update public.profiles set role = 'ADMIN' where id in (${staffAccount.id}::uuid, ${financeAccount.id}::uuid)`;
    await transaction`insert into public.admin_profiles (user_id, admin_role_id, job_title) values (${staffAccount.id}::uuid, ${productRole.id}::uuid, 'Fitment verifier'), (${financeAccount.id}::uuid, ${financeRole.id}::uuid, 'Finance boundary verifier')`;
    await transaction`update public.seller_profiles set status = 'ACTIVE', onboarding_completed_at = now(), state = 'Lagos', city = 'Ikeja' where user_id = ${sellerAccount.id}::uuid`;
    await transaction`update public.seller_verifications set status = 'APPROVED', reviewed_at = now() where seller_id = ${sellerAccount.id}::uuid`;
  });

  const buyer = await signIn(buyerAccount);
  const otherBuyer = await signIn(otherBuyerAccount);
  const seller = await signIn(sellerAccount);
  const staff = await signIn(staffAccount);
  const finance = await signIn(financeAccount);
  const anonymous = publicClient();

  const [catalog] = await sql<{ category_id: string; fitment_id: string }[]>`
    select
      (select id from public.product_categories where is_active order by position limit 1) as category_id,
      (select id from public.vehicle_fitments order by created_at limit 1) as fitment_id
  `;
  assert(catalog?.category_id && catalog.fitment_id, "Seeded category and fitment are required.");

  productId = randomUUID();
  const productWrite = await seller.from("products").insert({
    brand: "Toyota",
    category_id: catalog.category_id,
    city: "Ikeja",
    condition: "NEW",
    created_by_user_id: sellerAccount.id,
    delivery_available: true,
    description: "Live fitment verification product with evidence and ownership isolation.",
    last_modified_by_user_id: sellerAccount.id,
    name: "Live fitment verification part",
    oem_part_number: "TTP-FIT-001",
    pickup_available: true,
    price_minor: 25_000_00,
    quantity: 5,
    seller_id: sellerAccount.id,
    sku: `FIT-${randomUUID().slice(0, 8)}`,
    slug: `fitment-verifier-${randomUUID().slice(0, 8)}`,
    state: "Lagos",
  });
  assert(!productWrite.error, `Seller product creation failed: ${productWrite.error?.message}`);

  const claimWrite = await seller.from("product_fitments").insert({ product_id: productId, fitment_id: catalog.fitment_id });
  assert(!claimWrite.error, `Seller fitment claim failed: ${claimWrite.error?.message}`);
  const sellerClaim = await seller.from("product_fitments").select("evidence_type,claimed_by_user_id,is_active").eq("product_id", productId).single();
  assert(!sellerClaim.error && sellerClaim.data?.evidence_type === "SELLER_CLAIMED", "Seller claim was incorrectly elevated.");
  assert(sellerClaim.data.claimed_by_user_id === sellerAccount.id && sellerClaim.data.is_active, "Fitment claimant ownership is incorrect.");

  const illegalUpgrade = await seller.from("product_fitments").update({ evidence_type: "PLATFORM_VERIFIED" }).eq("product_id", productId);
  assert(Boolean(illegalUpgrade.error), "Seller upgraded its own fitment evidence.");
  const financeCorrection = await finance.rpc("correct_product_fitment", {
    p_evidence: "OEM_MATCHED", p_fitment_id: catalog.fitment_id, p_is_active: true,
    p_product_id: productId, p_reason: "Finance must not manage fitment evidence.",
  });
  assert(Boolean(financeCorrection.error), "Finance-only admin corrected fitment evidence.");
  const staffCorrection = await staff.rpc("correct_product_fitment", {
    p_evidence: "OEM_MATCHED", p_fitment_id: catalog.fitment_id, p_is_active: true,
    p_product_id: productId, p_reason: "OEM catalogue reference was reviewed for this test fitment.",
  });
  assert(!staffCorrection.error, `Authorized fitment correction failed: ${staffCorrection.error?.message}`);
  const reviewQueue = await staff.rpc("fitment_claims_for_review");
  assert(!reviewQueue.error && reviewQueue.data.some((claim) => claim.product_id === productId && claim.evidence_type === "OEM_MATCHED"), "Corrected evidence is missing from staff review.");
  const financeQueue = await finance.rpc("fitment_claims_for_review");
  assert(Boolean(financeQueue.error), "Finance-only admin accessed fitment review.");
  const sellerHistory = await seller.from("fitment_claim_history").select("action,new_evidence").eq("product_id", productId);
  assert(!sellerHistory.error && sellerHistory.data.length >= 2, "Seller cannot read the immutable history for its own listing.");
  const buyerHistory = await buyer.from("fitment_claim_history").select("id").eq("product_id", productId);
  assert(!buyerHistory.error && buyerHistory.data.length === 0, "Buyer read private seller fitment history.");

  const sellerCategory = await seller.from("seller_categories").insert({ category_id: catalog.category_id, is_primary: true, seller_id: sellerAccount.id });
  assert(!sellerCategory.error, `Seller category setup failed: ${sellerCategory.error?.message}`);
  requestId = randomUUID();
  const requestWrite = await buyer.from("part_requests").insert({
    buyer_id: buyerAccount.id, category_id: catalog.category_id, delivery_city: "Ikeja",
    delivery_state: "Lagos", description: "Fitment snapshot RFQ verification request.",
    fitment_id: catalog.fitment_id, id: requestId, part_name: "Live fitment verification part",
    quantity: 1, status: "DRAFT",
  });
  assert(!requestWrite.error, `RFQ draft failed: ${requestWrite.error?.message}`);
  const openRequest = await buyer.from("part_requests").update({ status: "OPEN", submitted_at: new Date().toISOString() }).eq("id", requestId);
  assert(!openRequest.error, `RFQ submission failed: ${openRequest.error?.message}`);
  const quoteWrite = await seller.from("part_request_quotes").insert({
    product_id: productId, quantity: 1, request_id: requestId,
    seller_id: sellerAccount.id, unit_price_minor: 25_000_00,
  }).select("id").single();
  assert(!quoteWrite.error && quoteWrite.data?.id, `RFQ quote failed: ${quoteWrite.error?.message}`);
  quoteId = quoteWrite.data.id;
  const accepted = await buyer.rpc("accept_part_request_quote", { p_quote_id: quoteId });
  assert(!accepted.error, `Quote acceptance failed: ${accepted.error?.message}`);

  const buyerSnapshot = await buyer.from("fitment_transaction_snapshots").select("id,eligible_at,fulfilled_at,product_snapshot,vehicle_snapshot").eq("source_reference_id", quoteId).single();
  assert(!buyerSnapshot.error && buyerSnapshot.data && !buyerSnapshot.data.eligible_at && !buyerSnapshot.data.fulfilled_at, "Accepted RFQ did not preserve an ineligible snapshot.");
  snapshotIds.push(buyerSnapshot.data.id);
  const isolatedSnapshot = await otherBuyer.from("fitment_transaction_snapshots").select("id").eq("id", buyerSnapshot.data.id);
  assert(!isolatedSnapshot.error && isolatedSnapshot.data.length === 0, "Another buyer read a private transaction snapshot.");
  const earlyFeedback = await buyer.rpc("submit_fitment_outcome", { p_outcome: "FIT_CONFIRMED", p_snapshot_id: buyerSnapshot.data.id });
  assert(Boolean(earlyFeedback.error), "Buyer submitted fitment feedback before fulfilment.");
  const directOutcome = await buyer.from("fitment_outcomes").insert({ buyer_id: buyerAccount.id, outcome: "FIT_CONFIRMED", snapshot_id: buyerSnapshot.data.id });
  assert(Boolean(directOutcome.error), "Buyer bypassed the eligibility RPC with a direct outcome insert.");

  await sql`update public.fitment_transaction_snapshots set eligible_at = now(), fulfilled_at = now() where id = ${buyerSnapshot.data.id}::uuid`;
  const otherBuyerFeedback = await otherBuyer.rpc("submit_fitment_outcome", { p_outcome: "FIT_CONFIRMED", p_snapshot_id: buyerSnapshot.data.id });
  assert(Boolean(otherBuyerFeedback.error), "Another buyer submitted fitment feedback for this transaction.");
  await submitOutcome(buyer, buyerSnapshot.data.id, "UNCONFIRMED");
  const initialPerformance = await seller.rpc("fitment_seller_performance", { p_seller_id: sellerAccount.id });
  assert(!initialPerformance.error && initialPerformance.data[0]?.eligible_count === 0, "Unconfirmed feedback entered the accuracy denominator.");

  const outcomes: FitmentOutcomeStatus[] = ["FIT_CONFIRMED", "FIT_CONFIRMED", "FIT_CONFIRMED", "FIT_PROBLEM_REPORTED", "WRONG_PART"];
  for (const outcome of outcomes) {
    const snapshotId = await insertEligibleSnapshot(buyerAccount.id, sellerAccount.id, catalog.fitment_id, catalog.category_id);
    await submitOutcome(buyer, snapshotId, outcome);
  }
  const measured = await seller.rpc("fitment_seller_performance", { p_seller_id: sellerAccount.id });
  assert(!measured.error && measured.data[0]?.eligible_count === 5, "Eligible fitment denominator is incorrect.");
  assert(measured.data[0]?.evidence_status === "MEASURED" && Number(measured.data[0]?.accuracy_percent) === 60, "Minimum-sample accuracy is incorrect.");
  const financePerformance = await finance.rpc("fitment_seller_performance", { p_seller_id: sellerAccount.id });
  assert(Boolean(financePerformance.error), "Finance-only admin accessed seller fitment metrics.");
  const rawEvents = await seller.from("fitment_events").select("id").eq("seller_id", sellerAccount.id);
  assert(Boolean(rawEvents.error), "Seller received direct access to raw fitment events.");

  const sessionA = randomUUID();
  for (let index = 0; index < 2; index += 1) {
    const token = randomUUID(); demandTokens.push(token);
    const result = await anonymous.rpc("record_demand_event", {
      p_event_token: token, p_event_type: "ZERO_RESULT_SEARCH", p_query: "Fitment verifier query",
      p_result_count: 0, p_session_id: sessionA,
    });
    assert(!result.error, `Anonymous demand recording failed: ${result.error?.message}`);
  }
  for (let index = 0; index < 2; index += 1) {
    const token = randomUUID(); demandTokens.push(token);
    const result = await anonymous.rpc("record_demand_event", {
      p_event_token: token, p_event_type: "ZERO_RESULT_SEARCH", p_query: "Fitment verifier query",
      p_result_count: 0, p_session_id: randomUUID(),
    });
    assert(!result.error, `Anonymous aggregate demand recording failed: ${result.error?.message}`);
  }
  const [deduped] = await sql<{ count: number }[]>`
    select count(*)::int as count from public.demand_events
    where event_token in ${sql(demandTokens)} and query = 'Fitment verifier query'
  `;
  assert(deduped?.count === 3, "Database-side session/search deduplication failed.");
  const rawDemand = await anonymous.from("demand_events").select("id").limit(1);
  assert(Boolean(rawDemand.error), "Anonymous client read raw demand events.");
  const demandSummary = await staff.rpc("demand_no_supply_summary");
  assert(!demandSummary.error && demandSummary.data.some((row) => row.demand_topic === "Fitment verifier query" && row.event_count === 3), "Thresholded demand aggregation is incorrect.");
  const financeDemand = await finance.rpc("demand_no_supply_summary");
  assert(Boolean(financeDemand.error), "Finance-only admin accessed demand intelligence.");

  console.log("Live fitment evidence, transaction eligibility, seller metrics, demand deduplication, permissions, and RLS checks passed.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  try {
    if (demandTokens.length) await sql`delete from public.demand_events where event_token in ${sql(demandTokens)}`;
    if (requestId) await sql`delete from public.demand_events where request_id = ${requestId}::uuid`;
    if (snapshotIds.length) {
      await sql`delete from public.fitment_events where snapshot_id in ${sql(snapshotIds)}`;
      await sql`delete from public.fitment_outcomes where snapshot_id in ${sql(snapshotIds)}`;
      await sql`delete from public.fitment_transaction_snapshots where id in ${sql(snapshotIds)}`;
    }
    if (quoteId) await sql`delete from public.part_request_quotes where id = ${quoteId}::uuid`;
    if (requestId) await sql`delete from public.part_requests where id = ${requestId}::uuid`;
    if (productId) {
      await sql`delete from public.inventory_transactions where product_id = ${productId}::uuid`;
      await sql`delete from public.product_modification_history where product_id = ${productId}::uuid`;
      await sql`delete from public.products where id = ${productId}::uuid`;
      await sql`delete from public.fitment_claim_history where product_id = ${productId}::uuid or seller_id in ${sql(userIds)}`;
    }
    if (userIds.length) await sql`delete from auth.users where id in ${sql(userIds)}`;
  } finally {
    await sql.end();
  }
});