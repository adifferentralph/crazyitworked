import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

import { createClient } from "@supabase/supabase-js";
import { config as loadEnvironment } from "dotenv";
import postgres from "postgres";
import { z } from "zod";

import type { Database } from "@/lib/supabase/database.types";

loadEnvironment({ path: ".env.local" });

const environment = z.object({
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
}).parse(process.env);

const sql = postgres(environment.DATABASE_URL, { max: 1, prepare: false });
const createdUserIds: string[] = [];
let requestId: string | null = null;
let savedVehicleId: string | null = null;

function publicClient() {
  return createClient<Database>(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false } },
  );
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function signup(role: "BUYER" | "SELLER", label: string, suffix: string) {
  const client = publicClient();
  const email = `rfq-${label}-${suffix}@gmail.com`;
  const password = `Ttp!${randomUUID()}Aa9`;
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: `RFQ ${label}`,
        requested_role: role,
        ...(role === "SELLER" ? { store_name: `RFQ ${label} Parts` } : { buyer_account_type: "FLEET_OPERATOR", organization_name: "RFQ Test Fleet" }),
      },
    },
  });
  assert(!error && data.user, `${label} signup failed: ${error?.message ?? "missing user"}`);
  createdUserIds.push(data.user.id);
  return { client, email, id: data.user.id, password };
}

async function signIn(email: string, password: string) {
  const client = publicClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  assert(!error, `Sign in failed for ${email}: ${error?.message}`);
  return client;
}

async function run() {
  const suffix = `${Date.now().toString(36)}-${randomUUID().slice(0, 5)}`;
  console.log("Creating live RFQ buyer...");
  const buyerAccount = await signup("BUYER", "buyer", suffix);
  console.log("Waiting for Supabase signup-email cooldown before matched seller...");
  await delay(61_000);
  const matchedAccount = await signup("SELLER", "matched-seller", suffix);
  console.log("Waiting for Supabase signup-email cooldown before isolation seller...");
  await delay(61_000);
  const otherAccount = await signup("SELLER", "other-seller", suffix);

  await sql`
    update auth.users
    set email_confirmed_at = coalesce(email_confirmed_at, now()), updated_at = now()
    where id in (${buyerAccount.id}::uuid, ${matchedAccount.id}::uuid, ${otherAccount.id}::uuid)
  `;

  const buyer = await signIn(buyerAccount.email, buyerAccount.password);
  const matchedSeller = await signIn(matchedAccount.email, matchedAccount.password);
  const otherSeller = await signIn(otherAccount.email, otherAccount.password);

  const [catalog] = await sql<{ category_id: string; fitment_id: string }[]>`
    select
      (select id from public.product_categories where is_active = true order by position, created_at limit 1) as category_id,
      (select id from public.vehicle_fitments order by created_at limit 1) as fitment_id
  `;
  assert(catalog?.category_id && catalog.fitment_id, "Seeded category and vehicle fitment are required.");

  await sql`
    update public.seller_profiles
    set status = 'ACTIVE', onboarding_completed_at = now(), state = 'Lagos', city = 'Ikeja'
    where user_id in (${matchedAccount.id}::uuid, ${otherAccount.id}::uuid)
  `;
  await sql`
    update public.seller_verifications
    set status = 'APPROVED', reviewed_at = now()
    where seller_id in (${matchedAccount.id}::uuid, ${otherAccount.id}::uuid)
  `;

  const categoryWrite = await matchedSeller.from("seller_categories").insert({
    category_id: catalog.category_id,
    is_primary: true,
    seller_id: matchedAccount.id,
  });
  assert(!categoryWrite.error, `Matched seller category write failed: ${categoryWrite.error?.message}`);

  savedVehicleId = randomUUID();
  const vehicleWrite = await buyer.from("saved_vehicles").insert({
    buyer_id: buyerAccount.id,
    fitment_id: catalog.fitment_id,
    id: savedVehicleId,
    is_default: true,
    label: "RFQ test vehicle",
  });
  assert(!vehicleWrite.error, `Buyer saved vehicle failed: ${vehicleWrite.error?.message}`);

  const sellerReadingVehicle = await matchedSeller.from("saved_vehicles").select("id").eq("id", savedVehicleId);
  assert(!sellerReadingVehicle.error && sellerReadingVehicle.data.length === 0, "Seller could read buyer saved vehicle.");

  requestId = randomUUID();
  const draftWrite = await buyer.from("part_requests").insert({
    buyer_id: buyerAccount.id,
    category_id: catalog.category_id,
    condition_preferences: ["NEW", "AFTERMARKET"],
    delivery_city: "Ikeja",
    delivery_state: "Lagos",
    description: "Live RFQ verification request with enough detail for a supplier quote.",
    fitment_id: catalog.fitment_id,
    id: requestId,
    part_name: "Live verification brake pad set",
    quantity: 2,
    saved_vehicle_id: savedVehicleId,
    status: "DRAFT",
  });
  assert(!draftWrite.error, `Buyer request draft failed: ${draftWrite.error?.message}`);

  const draftLeak = await matchedSeller.from("part_requests").select("id").eq("id", requestId);
  assert(!draftLeak.error && draftLeak.data.length === 0, "Seller could read an unmatched draft request.");

  const openWrite = await buyer
    .from("part_requests")
    .update({ status: "OPEN", submitted_at: new Date().toISOString() })
    .eq("id", requestId)
    .select("id, status")
    .single();
  assert(!openWrite.error && openWrite.data?.status === "OPEN", `Request submission failed: ${openWrite.error?.message}`);

  const matchedRows = await matchedSeller.from("seller_request_matches").select("request_id, status").eq("request_id", requestId);
  assert(!matchedRows.error && matchedRows.data.length === 1, "Verified category seller was not matched.");
  const unmatchedRows = await otherSeller.from("seller_request_matches").select("request_id").eq("request_id", requestId);
  assert(!unmatchedRows.error && unmatchedRows.data.length === 0, "Seller without a category was incorrectly matched.");

  const matchedRequest = await matchedSeller.from("part_requests").select("id, status").eq("id", requestId);
  assert(!matchedRequest.error && matchedRequest.data.length === 1, "Matched seller could not read request.");
  const isolatedRequest = await otherSeller.from("part_requests").select("id").eq("id", requestId);
  assert(!isolatedRequest.error && isolatedRequest.data.length === 0, "Unmatched seller could read request.");

  const unauthorizedQuote = await otherSeller.from("part_request_quotes").insert({
    quantity: 2,
    request_id: requestId,
    seller_id: otherAccount.id,
    unit_price_minor: 25_000_00,
  });
  assert(Boolean(unauthorizedQuote.error), "Unmatched seller inserted a quote.");

  const quoteWrite = await matchedSeller.from("part_request_quotes").insert({
    delivery_fee_minor: 5_000_00,
    estimated_delivery_days: 2,
    notes: "Live RFQ verification quote",
    quantity: 2,
    request_id: requestId,
    seller_id: matchedAccount.id,
    unit_price_minor: 22_500_00,
  }).select("id").single();
  assert(!quoteWrite.error && quoteWrite.data?.id, `Matched quote failed: ${quoteWrite.error?.message}`);

  const [quotedRequest] = await sql<{ status: string }[]>`select status::text from public.part_requests where id = ${requestId}::uuid`;
  assert(quotedRequest?.status === "QUOTED", "Quote trigger did not mark request QUOTED.");

  const sellerAccept = await matchedSeller.rpc("accept_part_request_quote", { p_quote_id: quoteWrite.data.id });
  assert(Boolean(sellerAccept.error), "Seller accepted its own quote through buyer-only RPC.");
  const buyerAccept = await buyer.rpc("accept_part_request_quote", { p_quote_id: quoteWrite.data.id });
  assert(!buyerAccept.error && buyerAccept.data === requestId, `Buyer quote acceptance failed: ${buyerAccept.error?.message}`);

  const [acceptedQuote, acceptedRequest] = await Promise.all([
    buyer.from("part_request_quotes").select("status").eq("id", quoteWrite.data.id).single(),
    buyer.from("part_requests").select("status").eq("id", requestId).single(),
  ]);
  assert(acceptedQuote.data?.status === "ACCEPTED", "Accepted quote status was not persisted.");
  assert(acceptedRequest.data?.status === "ACCEPTED", "Accepted request status was not persisted.");

  const illegalReopen = await buyer.from("part_requests").update({ status: "OPEN" }).eq("id", requestId).select("id");
  assert(Boolean(illegalReopen.error) || illegalReopen.data?.length === 0, "Buyer reopened an accepted request.");

  const anonymous = publicClient();
  const anonymousRead = await anonymous.from("part_requests").select("id").limit(1);
  assert(Boolean(anonymousRead.error), "Anonymous client read private RFQ data.");

  console.log("Live RFQ buyer/seller matching, quoting, acceptance, and RLS isolation passed.");
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      if (requestId) {
        await sql`delete from public.part_request_quotes where request_id = ${requestId}::uuid`;
        await sql`delete from public.part_requests where id = ${requestId}::uuid`;
      }
      if (savedVehicleId) await sql`delete from public.saved_vehicles where id = ${savedVehicleId}::uuid`;
      if (createdUserIds.length) await sql`delete from auth.users where id in ${sql(createdUserIds)}`;
    } finally {
      await sql.end();
    }
  });