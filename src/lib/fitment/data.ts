import "server-only";

import type { FitmentOutcomeStatus, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

function record(value: Json): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function textValue(value: Json | undefined) {
  return typeof value === "string" && value.trim() ? value : null;
}

export type BuyerFitmentCheck = {
  createdAt: string;
  id: string;
  outcome: FitmentOutcomeStatus | null;
  partName: string;
  sellerId: string;
  source: "CATALOG_ORDER" | "RFQ_ACCEPTED_QUOTE";
  vehicleLabel: string | null;
};

export async function getBuyerFitmentChecks(buyerId: string): Promise<BuyerFitmentCheck[]> {
  const supabase = await createClient();
  const { data: snapshots, error } = await supabase
    .from("fitment_transaction_snapshots")
    .select("id, source, seller_id, product_snapshot, vehicle_snapshot, created_at, eligible_at, fulfilled_at")
    .eq("buyer_id", buyerId)
    .not("eligible_at", "is", null)
    .not("fulfilled_at", "is", null)
    .lte("eligible_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(100);
  if (error || !snapshots?.length) return [];

  const { data: outcomes } = await supabase
    .from("fitment_outcomes")
    .select("snapshot_id, outcome")
    .eq("buyer_id", buyerId)
    .in("snapshot_id", snapshots.map((snapshot) => snapshot.id));
  const outcomeBySnapshot = new Map((outcomes ?? []).map((outcome) => [outcome.snapshot_id, outcome.outcome]));

  return snapshots.map((snapshot) => {
    const product = record(snapshot.product_snapshot);
    const vehicle = record(snapshot.vehicle_snapshot);
    const vehicleLabel = [vehicle.year, vehicle.make, vehicle.model, vehicle.trim, vehicle.engine]
      .filter((value): value is string | number => typeof value === "string" || typeof value === "number")
      .join(" · ");
    return {
      createdAt: snapshot.created_at,
      id: snapshot.id,
      outcome: outcomeBySnapshot.get(snapshot.id) ?? null,
      partName: textValue(product.name) ?? "Automotive part",
      sellerId: snapshot.seller_id,
      source: snapshot.source,
      vehicleLabel: vehicleLabel || null,
    };
  });
}

export async function getSellerFitmentPerformance(sellerId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("fitment_seller_performance", { p_seller_id: sellerId });
  return error ? null : data?.[0] ?? null;
}

export async function getFitmentOperationsData() {
  const supabase = await createClient();
  const [claims, demand] = await Promise.all([
    supabase.rpc("fitment_claims_for_review"),
    supabase.rpc("demand_no_supply_summary"),
  ]);
  return {
    claims: claims.error ? [] : claims.data ?? [],
    demand: demand.error ? [] : demand.data ?? [],
  };
}