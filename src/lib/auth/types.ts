import type { AccountStatus, UserRole } from "@/lib/supabase/database.types";

export type AuthActionState = {
  fieldErrors?: Record<string, string[] | undefined>;
  message?: string;
  status: "idle" | "error" | "success";
  values?: {
    accountType?: string;
    email?: string;
    firstName?: string;
    fullName?: string;
    lastName?: string;
    marketingOptIn?: "on";
    organizationName?: string;
    phone?: string;
    storeName?: string;
    terms?: "on";
  };
};

export const initialAuthActionState: AuthActionState = { status: "idle" };

export type Principal = {
  email: string;
  fullName: string;
  id: string;
  role: UserRole;
  status: AccountStatus;
};