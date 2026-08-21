import type { ReactNode } from "react";

import { requireRole } from "@/lib/auth/principal";

export default async function BuyerAccountLayout({ children }: { children: ReactNode }) {
  await requireRole(["BUYER"], "/account");
  return children;
}