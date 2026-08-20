import { CircleAlert, CircleCheck } from "lucide-react";

import type { AuthActionState } from "@/lib/auth/types";

export function AuthAlert({ state }: { state: AuthActionState }) {
  if (state.status === "idle" || !state.message) {
    return null;
  }

  const isSuccess = state.status === "success";
  const Icon = isSuccess ? CircleCheck : CircleAlert;

  return (
    <div
      className={
        isSuccess
          ? "flex gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
          : "flex gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900"
      }
      role={isSuccess ? "status" : "alert"}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>{state.message}</p>
    </div>
  );
}
