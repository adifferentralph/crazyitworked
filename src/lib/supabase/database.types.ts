export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = "BUYER" | "SELLER" | "ADMIN";
export type AccountStatus = "ACTIVE" | "RESTRICTED" | "SUSPENDED";
export type SellerStatus =
  | "PENDING_VERIFICATION"
  | "ACTIVE"
  | "RESTRICTED"
  | "SUSPENDED"
  | "REJECTED";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          phone: string | null;
          role: UserRole;
          status: AccountStatus;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          full_name: string;
          id: string;
          phone?: string | null;
          role?: UserRole;
          status?: AccountStatus;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          full_name?: string;
          phone?: string | null;
        };
        Relationships: [];
      };
      buyer_profiles: {
        Row: {
          created_at: string;
          preferred_market: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          preferred_market?: string;
          user_id: string;
        };
        Update: {
          preferred_market?: string;
        };
        Relationships: [];
      };
      seller_profiles: {
        Row: {
          business_registration_number: string | null;
          city: string | null;
          country: string;
          created_at: string;
          description: string | null;
          slug: string;
          state: string | null;
          status: SellerStatus;
          store_name: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          store_name: string;
          user_id: string;
        };
        Update: {
          business_registration_number?: string | null;
          city?: string | null;
          country?: string;
          description?: string | null;
          state?: string | null;
          store_name?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      account_status: AccountStatus;
      seller_status: SellerStatus;
      user_role: UserRole;
    };
    CompositeTypes: Record<string, never>;
  };
};
