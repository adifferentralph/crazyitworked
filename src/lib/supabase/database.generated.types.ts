export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = "BUYER" | "SELLER" | "ADMIN";
export type AccountStatus = "ACTIVE" | "RESTRICTED" | "SUSPENDED";
export type BuyerAccountType =
  | "INDIVIDUAL"
  | "MECHANIC_TECHNICIAN"
  | "GARAGE_WORKSHOP"
  | "FLEET_OPERATOR"
  | "CORPORATE_BUYER";
export type PartRequestStatus =
  | "DRAFT"
  | "OPEN"
  | "QUOTED"
  | "ACCEPTED"
  | "CLOSED"
  | "CANCELLED"
  | "EXPIRED";
export type PartQuoteStatus =
  | "SUBMITTED"
  | "REVISED"
  | "ACCEPTED"
  | "REJECTED"
  | "WITHDRAWN"
  | "EXPIRED";
export type SellerRequestMatchStatus = "MATCHED" | "VIEWED" | "QUOTED" | "DECLINED";
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
        TimestampColumns & {
          account_type: BuyerAccountType;
          business_registration_number: string | null;
          organization_name: string | null;
          preferred_market: string;
          user_id: string;
        },
        {
          account_type?: BuyerAccountType;
          business_registration_number?: string | null;
          organization_name?: string | null;
          preferred_market?: string;
          user_id: string;
        },
        {
          account_type?: BuyerAccountType;
          business_registration_number?: string | null;
          organization_name?: string | null;
          preferred_market?: string;
        }
      >;
      saved_vehicles: Table<
        TimestampColumns & {
          buyer_id: string;
          fitment_id: string;
          id: string;
          is_default: boolean;
          label: string | null;
          registration_number: string | null;
        },
        {
          buyer_id: string;
          fitment_id: string;
          id?: string;
          is_default?: boolean;
          label?: string | null;
          registration_number?: string | null;
        },
        {
          fitment_id?: string;
          is_default?: boolean;
          label?: string | null;
          registration_number?: string | null;
        }
      >;
      saved_parts: Table<
        { buyer_id: string; created_at: string; product_id: string },
        { buyer_id: string; product_id: string },
        Record<string, never>
      >;
      cart_items: Table<
        TimestampColumns & { buyer_id: string; id: string; product_id: string; quantity: number },
        { buyer_id: string; id?: string; product_id: string; quantity?: number },
        { quantity?: number }
      >;
seller_categories: Table<
        TimestampColumns & { category_id: string; is_primary: boolean; seller_id: string },
        { category_id: string; is_primary?: boolean; seller_id: string },
        { is_primary?: boolean }
      >;
      part_requests: Table<
        TimestampColumns & {
          budget_max_minor: number | null;
          budget_min_minor: number | null;
          buyer_id: string;
          category_id: string | null;
          closed_at: string | null;
          condition_preferences: string[];
          currency: "NGN";
          delivery_city: string;
          delivery_state: string;
          description: string;
          fitment_id: string | null;
          id: string;
          manufacturer_part_number: string | null;
          oem_part_number: string | null;
          part_name: string;
          quantity: number;
          saved_vehicle_id: string | null;
          status: PartRequestStatus;
          submitted_at: string | null;
        },
        {
          budget_max_minor?: number | null;
          budget_min_minor?: number | null;
          buyer_id: string;
          category_id?: string | null;
          condition_preferences?: string[];
          delivery_city: string;
          delivery_state: string;
          description: string;
          fitment_id?: string | null;
          id?: string;
          manufacturer_part_number?: string | null;
          oem_part_number?: string | null;
          part_name: string;
          quantity?: number;
          saved_vehicle_id?: string | null;
          status?: PartRequestStatus;
          submitted_at?: string | null;
        },
        {
          budget_max_minor?: number | null;
          budget_min_minor?: number | null;
          category_id?: string | null;
          closed_at?: string | null;
          condition_preferences?: string[];
          delivery_city?: string;
          delivery_state?: string;
          description?: string;
          fitment_id?: string | null;
          manufacturer_part_number?: string | null;
          oem_part_number?: string | null;
          part_name?: string;
          quantity?: number;
          saved_vehicle_id?: string | null;
          status?: PartRequestStatus;
          submitted_at?: string | null;
        }
      >;
      seller_request_matches: Table<
        TimestampColumns & {
          category_matched: boolean;
          id: string;
          location_matched: boolean;
          matched_at: string;
          request_id: string;
          responded_at: string | null;
          seller_id: string;
          status: SellerRequestMatchStatus;
          viewed_at: string | null;
        },
        {
          category_matched?: boolean;
          location_matched?: boolean;
          request_id: string;
          seller_id: string;
        },
        { responded_at?: string | null; status?: SellerRequestMatchStatus; viewed_at?: string | null }
      >;
      part_request_quotes: Table<
        TimestampColumns & {
          currency: "NGN";
          delivery_fee_minor: number;
          estimated_delivery_days: number | null;
          id: string;
          notes: string | null;
          product_id: string | null;
          quantity: number;
          request_id: string;
          seller_id: string;
          status: PartQuoteStatus;
          submitted_at: string;
          unit_price_minor: number;
          valid_until: string | null;
        },
        {
          delivery_fee_minor?: number;
          estimated_delivery_days?: number | null;
          notes?: string | null;
          product_id?: string | null;
          quantity: number;
          request_id: string;
          seller_id: string;
          unit_price_minor: number;
          valid_until?: string | null;
        },
        {
          delivery_fee_minor?: number;
          estimated_delivery_days?: number | null;
          notes?: string | null;
          product_id?: string | null;
          quantity?: number;
          status?: PartQuoteStatus;
          unit_price_minor?: number;
          valid_until?: string | null;
        }
      >;
      part_request_images: Table<
        {
          created_at: string;
          id: string;
          mime_type: string;
          original_filename: string;
          request_id: string;
          size_bytes: number;
          storage_bucket: string;
          storage_path: string;
          uploaded_by: string;
        },
        {
          mime_type: string;
          original_filename: string;
          request_id: string;
          size_bytes: number;
          storage_path: string;
          uploaded_by: string;
        }
      >;
      part_request_events: Table<{
        actor_user_id: string | null;
        created_at: string;
        event_type: string;
        id: string;
        metadata: Json;
        request_id: string;
      }>;      seller_profiles: Table<
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
    Functions: {
      accept_part_request_quote: {
        Args: { p_quote_id: string };
        Returns: string;
      };
    };
    Enums: {
      account_status: AccountStatus;
      buyer_account_type: BuyerAccountType;
      inventory_transaction_type: InventoryTransactionType;
      product_condition: ProductCondition;
      product_image_source: ProductImageSource;
      product_image_type: ProductImageType;
      part_quote_status: PartQuoteStatus;
      part_request_status: PartRequestStatus;
      product_status: ProductStatus;
      seller_request_match_status: SellerRequestMatchStatus;
      seller_status: SellerStatus;
      seller_verification_status: SellerVerificationStatus;
      user_role: UserRole;
    };
    CompositeTypes: Record<string, never>;
  };
};
