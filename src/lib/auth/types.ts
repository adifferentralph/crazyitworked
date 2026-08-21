import type { AccountStatus, UserRole } from "@/lib/supabase/database.types";

export type AuthActionState = {
  fieldErrors?: Record<string, string[] | undefined>;
  message?: string;
  status: "idle" | "error" | "success";
  values?: {
    email?: string;
    fullName?: string;
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
