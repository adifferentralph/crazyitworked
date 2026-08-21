import { AlertCircle, CheckCircle2 } from "lucide-react";

import type { SellerActionState } from "@/lib/marketplace/seller-action-state";

export function SellerFormAlert({ state }: { state: SellerActionState }) {
  if (!state.message) return null;

  const success = state.status === "success";
  const Icon = success ? CheckCircle2 : AlertCircle;
  return (
    <div
      className={success ? "rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900" : "rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900"}
      role={success ? "status" : "alert"}
    >
      <div className="flex gap-2">
        <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>{state.message}</p>
      </div>
    </div>
  );
}
