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
export type ProductImageSource =
  | "SELLER_ORIGINAL"
  | "PLATFORM_ASSISTED_ORIGINAL"
  | "BULK_IMPORT_ORIGINAL"
  | "ADMIN_APPROVED"
  | "ADMIN_REPLACEMENT";
export type ProductCreationSource = "SELLER" | "PLATFORM_ASSISTED" | "BULK_IMPORT";
export type InventoryImportStatus =
  | "VALIDATING"
  | "READY"
  | "HAS_ERRORS"
  | "IMPORTED"
  | "CANCELLED";
export type InventoryImportRowStatus = "VALID" | "INVALID" | "DUPLICATE" | "IMPORTED";
export type InventoryTransactionType =
  | "INITIAL_STOCK"
  | "SELLER_ADJUSTMENT"
  | "RESERVATION"
  | "RESERVATION_RELEASE"
  | "SALE"
  | "RETURN"
  | "ADMIN_ADJUSTMENT";
export type FitmentEvidenceType =
  | "SELLER_CLAIMED"
  | "OEM_MATCHED"
  | "PLATFORM_VERIFIED"
  | "PURCHASE_VERIFIED"
  | "BUYER_CONFIRMED"
  | "DISPUTED"
  | "KNOWN_INCORRECT";
export type FitmentOutcomeStatus =
  | "FIT_CONFIRMED"
  | "FIT_PROBLEM_REPORTED"
  | "WRONG_PART"
  | "UNCONFIRMED"
  | "NOT_APPLICABLE";
export type FitmentEventType =
  | "SELLER_CLAIM_RECORDED"
  | "OEM_MATCHED"
  | "PLATFORM_VERIFIED"
  | "PURCHASE_COMPLETED"
  | "BUYER_CONFIRMED"
  | "FIT_PROBLEM_REPORTED"
  | "WRONG_PART_REPORTED"
  | "DISPUTE_OPENED"
  | "INCOMPATIBILITY_RETURN"
  | "ADMIN_CORRECTION"
  | "OEM_CORRECTION"
  | "LISTING_CORRECTION"
  | "REPEAT_PURCHASE_CONFIRMED";
export type FitmentTransactionSource = "CATALOG_ORDER" | "RFQ_ACCEPTED_QUOTE";
export type DemandEventType =
  | "ZERO_RESULT_SEARCH"
  | "ABANDONED_FILTERED_SEARCH"
  | "RFQ_CREATED"
  | "RFQ_ZERO_QUOTES"
  | "RFQ_NO_ACCEPTABLE_QUOTE";

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
      inventory_imports: Table<
        {
          completed_at: string | null;
          created_at: string;
          created_by_user_id: string;
          duplicate_rows: number;
          file_name: string;
          file_sha256: string;
          id: string;
          imported_rows: number;
          invalid_rows: number;
          metadata: Json;
          seller_id: string;
          status: InventoryImportStatus;
          total_rows: number;
          updated_at: string;
          valid_rows: number;
        },
        {
          completed_at?: string | null;
          created_by_user_id: string;
          duplicate_rows?: number;
          file_name: string;
          file_sha256: string;
          id?: string;
          imported_rows?: number;
          invalid_rows?: number;
          metadata?: Json;
          seller_id: string;
          status?: InventoryImportStatus;
          total_rows?: number;
          valid_rows?: number;
        },
        {
          completed_at?: string | null;
          duplicate_rows?: number;
          imported_rows?: number;
          invalid_rows?: number;
          metadata?: Json;
          status?: InventoryImportStatus;
          total_rows?: number;
          valid_rows?: number;
        }
      >;
      inventory_import_rows: Table<
        {
          created_at: string;
          id: string;
          import_id: string;
          imported_at: string | null;
          normalized_data: Json;
          product_id: string | null;
          raw_data: Json;
          row_number: number;
          status: InventoryImportRowStatus;
          validation_errors: string[];
        },
        {
          id?: string;
          import_id: string;
          imported_at?: string | null;
          normalized_data?: Json;
          product_id?: string | null;
          raw_data?: Json;
          row_number: number;
          status: InventoryImportRowStatus;
          validation_errors?: string[];
        },
        {
          imported_at?: string | null;
          product_id?: string | null;
          status?: InventoryImportRowStatus;
          validation_errors?: string[];
        }
      >;      profiles: Table<
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
          assisted_onboarding: boolean;
          brand: string;
          category_id: string;
          city: string;
          condition: ProductCondition;
          country: string;
          created_by_user_id: string;
          creation_source: ProductCreationSource;
          currency: "NGN";
          delivery_available: boolean;
          description: string;
          id: string;
          last_modified_by_user_id: string;
          manufacturer_part_number: string | null;
          name: string;
          oem_part_number: string | null;
          pickup_available: boolean;
          price_minor: number;
          published_at: string | null;
          quantity: number;
          reserved_quantity: number;
          seller_acknowledged_at: string | null;
          seller_id: string;
          sku: string;
          slug: string;
          state: string;
          status: ProductStatus;
          submitted_at: string | null;
          version: number;
        },
        {
          assisted_onboarding?: boolean;
          brand: string;
          category_id: string;
          city: string;
          condition: ProductCondition;
          country?: string;
          created_by_user_id: string;
          creation_source?: ProductCreationSource;
          currency?: "NGN";
          delivery_available: boolean;
          description: string;
          id?: string;
          last_modified_by_user_id: string;
          manufacturer_part_number?: string | null;
          name: string;
          oem_part_number?: string | null;
          pickup_available: boolean;
          price_minor: number;
          quantity: number;
          reserved_quantity?: number;
          seller_acknowledged_at?: string | null;
          seller_id: string;
          sku: string;
          slug: string;
          state: string;
          status?: ProductStatus;
        },
        {
          assisted_onboarding?: boolean;
          brand?: string;
          category_id?: string;
          city?: string;
          condition?: ProductCondition;
          country?: "Nigeria";
          created_by_user_id?: string;
          creation_source?: ProductCreationSource;
          delivery_available?: boolean;
          description?: string;
          last_modified_by_user_id?: string;
          manufacturer_part_number?: string | null;
          name?: string;
          oem_part_number?: string | null;
          pickup_available?: boolean;
          price_minor?: number;
          quantity?: number;
          seller_acknowledged_at?: string | null;
          sku?: string;
          state?: string;
          status?: ProductStatus;
        }
      >;      product_cross_references: Table<
        { created_at: string; id: string; product_id: string; reference_number: string },
        { product_id: string; reference_number: string }
      >;
      product_fitments: Table<
        {
          claimed_by_user_id: string;
          created_at: string;
          evidence_metadata: Json;
          evidence_type: FitmentEvidenceType;
          fitment_id: string;
          is_active: boolean;
          notes: string | null;
          product_id: string;
          updated_at: string;
          verified_at: string | null;
          verified_by_user_id: string | null;
        },
        {
          claimed_by_user_id?: string;
          evidence_metadata?: Json;
          evidence_type?: FitmentEvidenceType;
          fitment_id: string;
          is_active?: boolean;
          notes?: string | null;
          product_id: string;
          verified_at?: string | null;
          verified_by_user_id?: string | null;
        },
        {
          evidence_metadata?: Json;
          evidence_type?: FitmentEvidenceType;
          is_active?: boolean;
          notes?: string | null;
          verified_at?: string | null;
          verified_by_user_id?: string | null;
        }
      >;
      fitment_claim_history: Table<{
        action: "INSERT" | "UPDATE" | "DELETE" | "BASELINE";
        changed_by_user_id: string | null;
        created_at: string;
        fitment_id: string | null;
        id: string;
        metadata: Json;
        new_active: boolean | null;
        new_evidence: FitmentEvidenceType | null;
        previous_active: boolean | null;
        previous_evidence: FitmentEvidenceType | null;
        product_id: string | null;
        reason: string | null;
        seller_id: string;
        vehicle_snapshot: Json;
      }>;
      fitment_transaction_snapshots: Table<{
        buyer_id: string;
        category_id: string | null;
        created_at: string;
        eligible_at: string | null;
        fitment_id: string | null;
        fulfilled_at: string | null;
        id: string;
        product_id: string | null;
        product_snapshot: Json;
        seller_id: string;
        source: FitmentTransactionSource;
        source_reference_id: string;
        vehicle_snapshot: Json;
      }>;
      fitment_outcomes: Table<{
        buyer_id: string;
        created_at: string;
        id: string;
        metadata: Json;
        note: string | null;
        outcome: FitmentOutcomeStatus;
        snapshot_id: string;
        submitted_at: string;
      }>;
      fitment_events: Table<{
        buyer_id: string | null;
        category_id: string | null;
        created_at: string;
        created_by_user_id: string | null;
        event_type: FitmentEventType;
        fitment_id: string | null;
        id: string;
        metadata: Json;
        occurred_at: string;
        product_id: string | null;
        product_snapshot: Json;
        seller_id: string | null;
        snapshot_id: string | null;
        vehicle_snapshot: Json;
      }>;
      demand_events: Table<{
        anonymous_session_hash: string;
        buyer_account_type: string;
        buyer_id: string | null;
        category_id: string | null;
        event_token: string;
        event_type: DemandEventType;
        fitment_id: string | null;
        id: string;
        location: string | null;
        metadata: Json;
        occurred_at: string;
        query: string | null;
        request_id: string | null;
        result_count: number | null;
        vehicle_make: string | null;
        vehicle_model: string | null;
        vehicle_year: number | null;
      }>;
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
      correct_product_fitment: {
        Args: {
          p_evidence: FitmentEvidenceType;
          p_fitment_id: string;
          p_is_active: boolean;
          p_product_id: string;
          p_reason: string;
        };
        Returns: undefined;
      };
      demand_no_supply_summary: {
        Args: Record<PropertyKey, never>;
        Returns: {
          buyer_account_type: string;
          category_name: string | null;
          demand_topic: string | null;
          event_count: number;
          event_type: DemandEventType;
          last_seen_at: string;
          location: string | null;
          vehicle_make: string | null;
          vehicle_model: string | null;
          vehicle_year: number | null;
        }[];
      };
      fitment_claims_for_review: {
        Args: Record<PropertyKey, never>;
        Returns: {
          evidence_type: FitmentEvidenceType;
          fitment_id: string;
          is_active: boolean;
          problem_event_count: number;
          product_id: string;
          product_name: string;
          seller_id: string;
          store_name: string;
          updated_at: string;
          vehicle_label: string;
        }[];
      };
      fitment_seller_performance: {
        Args: { p_seller_id?: string | null };
        Returns: {
          accuracy_percent: number | null;
          confirmed_count: number;
          dispute_count: number;
          eligible_count: number;
          evidence_status: "NO_DATA" | "INSUFFICIENT_SAMPLE" | "MEASURED";
          fit_problem_count: number;
          return_count: number;
          wrong_part_count: number;
        }[];
      };
      record_demand_event: {
        Args: {
          p_category_id?: string | null;
          p_event_token: string;
          p_event_type: DemandEventType;
          p_fitment_id?: string | null;
          p_location?: string | null;
          p_query?: string | null;
          p_result_count?: number | null;
          p_session_id: string;
        };
        Returns: undefined;
      };
      submit_fitment_outcome: {
        Args: { p_note?: string | null; p_outcome: FitmentOutcomeStatus; p_snapshot_id: string };
        Returns: undefined;
      };
      accept_part_request_quote: {
        Args: { p_quote_id: string };
        Returns: string;
      };
      confirm_assisted_product: {
        Args: { p_product_id: string };
        Returns: undefined;
      };
      create_assisted_product_draft: {
        Args: {
          p_brand: string;
          p_category_id: string;
          p_city: string;
          p_condition: ProductCondition;
          p_creation_source: ProductCreationSource;
          p_cross_references: string[];
          p_delivery_available: boolean;
          p_description: string;
          p_fitment_ids: string[];
          p_manufacturer_part_number: string | null;
          p_name: string;
          p_oem_part_number: string | null;
          p_pickup_available: boolean;
          p_price_minor: number;
          p_quantity: number;
          p_seller_id: string;
          p_sku: string;
          p_slug: string;
          p_state: string;
        };
        Returns: string;
      };
      inventory_onboarding_products: {
        Args: Record<PropertyKey, never>;
        Returns: {
          active_image_count: number;
          creation_source: ProductCreationSource;
          product_id: string;
          product_name: string;
          product_status: ProductStatus;
          seller_acknowledged_at: string | null;
          seller_id: string;
          sku: string;
          store_name: string;
          updated_at: string;
        }[];
      };
      inventory_onboarding_sellers: {
        Args: Record<PropertyKey, never>;
        Returns: {
          city: string | null;
          seller_id: string;
          seller_status: SellerStatus;
          state: string | null;
          store_name: string;
        }[];
      };
      register_assisted_product_image: {
        Args: {
          p_is_actual_item: boolean;
          p_mime_type: string;
          p_original_filename: string;
          p_product_id: string;
          p_size_bytes: number;
          p_storage_path: string;
          p_type: ProductImageType;
        };
        Returns: string;
      };
    };
    Enums: {
      account_status: AccountStatus;
      demand_event_type: DemandEventType;
      fitment_event_type: FitmentEventType;
      fitment_evidence_type: FitmentEvidenceType;
      fitment_outcome_status: FitmentOutcomeStatus;
      fitment_transaction_source: FitmentTransactionSource;
      buyer_account_type: BuyerAccountType;
      inventory_import_row_status: InventoryImportRowStatus;
      inventory_import_status: InventoryImportStatus;
      inventory_transaction_type: InventoryTransactionType;
      product_condition: ProductCondition;
      product_creation_source: ProductCreationSource;
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
