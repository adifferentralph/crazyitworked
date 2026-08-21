export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = "BUYER" | "SELLER" | "ADMIN";
export type AccountStatus = "ACTIVE" | "RESTRICTED" | "SUSPENDED";
export type SellerStatus =
  | "PENDING_VERIFICATION"
  | "ACTIVE"
  | "RESTRICTED"
  | "SUSPENDED"
  | "REJECTED";
export type SellerVerificationStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
export type ProductCondition =
  | "NEW"
  | "USED"
  | "REFURBISHED"
  | "RECONDITIONED"
  | "OEM_TAKE_OFF"
  | "AFTERMARKET";
export type ProductStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "NEEDS_CHANGES"
  | "APPROVED"
  | "REJECTED"
  | "FLAGGED"
  | "SUSPENDED"
  | "OUT_OF_STOCK";
export type ProductImageType =
  | "PRIMARY"
  | "ANGLE"
  | "DETAIL"
  | "PART_NUMBER"
  | "PACKAGING"
  | "OTHER";
export type ProductImageSource = "SELLER_ORIGINAL" | "ADMIN_APPROVED" | "ADMIN_REPLACEMENT";
export type InventoryTransactionType =
  | "INITIAL_STOCK"
  | "SELLER_ADJUSTMENT"
  | "RESERVATION"
  | "RESERVATION_RELEASE"
  | "SALE"
  | "RETURN"
  | "ADMIN_ADJUSTMENT";

type Table<Row, Insert = Partial<Row>, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type TimestampColumns = {
  created_at: string;
  updated_at: string;
};

type CatalogRecord = TimestampColumns & {
  id: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        TimestampColumns & {
          avatar_url: string | null;
          email: string;
          full_name: string;
          id: string;
          phone: string | null;
          role: UserRole;
          status: AccountStatus;
        },
        {
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          full_name: string;
          id: string;
          phone?: string | null;
          role?: UserRole;
          status?: AccountStatus;
          updated_at?: string;
        },
        { avatar_url?: string | null; full_name?: string; phone?: string | null }
      >;
      buyer_profiles: Table<
        TimestampColumns & { preferred_market: string; user_id: string },
        { preferred_market?: string; user_id: string },
        { preferred_market?: string }
      >;
      seller_profiles: Table<
        TimestampColumns & {
          business_registration_number: string | null;
          city: string | null;
          contact_phone: string | null;
          country: string;
          description: string | null;
          onboarding_completed_at: string | null;
          slug: string;
          state: string | null;
          status: SellerStatus;
          store_name: string;
          user_id: string;
          website_url: string | null;
        },
        { store_name: string; user_id: string },
        {
          business_registration_number?: string | null;
          city?: string | null;
          contact_phone?: string | null;
          country?: string;
          description?: string | null;
          onboarding_completed_at?: string | null;
          state?: string | null;
          store_name?: string;
          website_url?: string | null;
        }
      >;
      seller_verifications: Table<
        TimestampColumns & {
          id: string;
          metadata: Json;
          rejection_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          seller_id: string;
          status: SellerVerificationStatus;
          submitted_at: string | null;
        },
        { seller_id: string; status?: SellerVerificationStatus; submitted_at?: string | null },
        { status?: SellerVerificationStatus; submitted_at?: string | null }
      >;
      product_categories: Table<
        CatalogRecord & {
          description: string | null;
          is_active: boolean;
          name: string;
          parent_id: string | null;
          position: number;
          slug: string;
        }
      >;
      vehicle_makes: Table<
        CatalogRecord & { is_active: boolean; name: string; slug: string }
      >;
      vehicle_models: Table<
        CatalogRecord & { is_active: boolean; make_id: string; name: string; slug: string }
      >;
      vehicle_generations: Table<
        CatalogRecord & {
          end_year: number | null;
          model_id: string;
          name: string;
          start_year: number;
        }
      >;
      vehicle_years: Table<
        CatalogRecord & { generation_id: string | null; model_id: string; year: number }
      >;
      vehicle_trims: Table<
        CatalogRecord & { generation_id: string | null; model_id: string; name: string }
      >;
      engines: Table<
        CatalogRecord & {
          code: string | null;
          displacement_cc: number | null;
          fuel_type: string | null;
          name: string;
        }
      >;
      transmissions: Table<CatalogRecord & { code: string; name: string }>;
      drivetrains: Table<CatalogRecord & { code: string; name: string }>;
      vehicle_fitments: Table<
        CatalogRecord & {
          drivetrain_id: string | null;
          engine_id: string | null;
          generation_id: string | null;
          make_id: string;
          model_id: string;
          transmission_id: string | null;
          trim_id: string | null;
          year_id: string;
        }
      >;
      products: Table<
        TimestampColumns & {
          brand: string;
          category_id: string;
          city: string;
          condition: ProductCondition;
          country: string;
          currency: "NGN";
          delivery_available: boolean;
          description: string;
          id: string;
          manufacturer_part_number: string | null;
          name: string;
          oem_part_number: string | null;
          pickup_available: boolean;
          price_minor: number;
          published_at: string | null;
          quantity: number;
          reserved_quantity: number;
          seller_id: string;
          sku: string;
          slug: string;
          state: string;
          status: ProductStatus;
          submitted_at: string | null;
          version: number;
        },
        {
          brand: string;
          category_id: string;
          city: string;
          condition: ProductCondition;
          country?: string;
          currency?: "NGN";
          delivery_available: boolean;
          description: string;
          id?: string;
          manufacturer_part_number?: string | null;
          name: string;
          oem_part_number?: string | null;
          pickup_available: boolean;
          price_minor: number;
          quantity: number;
          reserved_quantity?: number;
          seller_id: string;
          sku: string;
          slug: string;
          state: string;
          status?: ProductStatus;
        },
        {
          brand?: string;
          category_id?: string;
          city?: string;
          condition?: ProductCondition;
          country?: "Nigeria";
          delivery_available?: boolean;
          description?: string;
          manufacturer_part_number?: string | null;
          name?: string;
          oem_part_number?: string | null;
          pickup_available?: boolean;
          price_minor?: number;
          quantity?: number;
          sku?: string;
          state?: string;
          status?: ProductStatus;
        }
      >;
      product_cross_references: Table<
        { created_at: string; id: string; product_id: string; reference_number: string },
        { product_id: string; reference_number: string }
      >;
      product_fitments: Table<
        { created_at: string; fitment_id: string; notes: string | null; product_id: string },
        { fitment_id: string; notes?: string | null; product_id: string }
      >;
      product_images: Table<
        {
          created_at: string;
          deactivated_at: string | null;
          id: string;
          is_active: boolean;
          is_actual_item: boolean;
          is_primary: boolean;
          metadata: Json;
          mime_type: string;
          original_filename: string;
          position: number;
          product_id: string;
          size_bytes: number;
          source: ProductImageSource;
          storage_bucket: string;
          storage_path: string;
          type: ProductImageType;
          uploaded_by: string;
        },
        {
          id?: string;
          is_actual_item?: boolean;
          is_primary?: boolean;
          mime_type: string;
          original_filename: string;
          position: number;
          product_id: string;
          size_bytes: number;
          source?: ProductImageSource;
          storage_bucket?: string;
          storage_path: string;
          type: ProductImageType;
          uploaded_by: string;
        },
        { is_active?: boolean; is_actual_item?: boolean; is_primary?: boolean; position?: number }
      >;
      product_media_history: Table<{
        action: "UPLOADED" | "ACTIVATED" | "DEACTIVATED" | "REPLACED";
        actor_user_id: string | null;
        created_at: string;
        id: string;
        metadata: Json;
        product_id: string;
        product_image_id: string | null;
        source: ProductImageSource;
        storage_path: string;
      }>;
      inventory_transactions: Table<{
        actor_user_id: string | null;
        created_at: string;
        id: string;
        metadata: Json;
        product_id: string;
        quantity_after: number;
        quantity_before: number;
        quantity_delta: number;
        reason: string | null;
        reserved_after: number;
        reserved_before: number;
        reserved_delta: number;
        type: InventoryTransactionType;
      }>;
      product_modification_history: Table<{
        action: string;
        actor_user_id: string | null;
        created_at: string;
        id: string;
        new_value: Json | null;
        previous_value: Json | null;
        product_id: string;
      }>;
    };
    Views: {
      marketplace_product_search: {
        Row: {
          product_id: string;
          search_text: string;
        };
        Relationships: [];
      };      marketplace_sellers: {
        Row: {
          city: string | null;
          country: string;
          seller_id: string;
          seller_status: string;
          slug: string;
          state: string | null;
          store_name: string;
          verification_status: string;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: {
      account_status: AccountStatus;
      inventory_transaction_type: InventoryTransactionType;
      product_condition: ProductCondition;
      product_image_source: ProductImageSource;
      product_image_type: ProductImageType;
      product_status: ProductStatus;
      seller_status: SellerStatus;
      seller_verification_status: SellerVerificationStatus;
      user_role: UserRole;
    };
    CompositeTypes: Record<string, never>;
  };
};
