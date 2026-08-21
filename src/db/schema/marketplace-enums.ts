import { pgEnum } from "drizzle-orm/pg-core";

export const sellerVerificationStatusEnum = pgEnum("seller_verification_status", [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
]);

export const productConditionEnum = pgEnum("product_condition", [
  "NEW",
  "USED",
  "REFURBISHED",
  "RECONDITIONED",
  "OEM_TAKE_OFF",
  "AFTERMARKET",
]);

export const productStatusEnum = pgEnum("product_status", [
  "DRAFT",
  "PENDING_REVIEW",
  "NEEDS_CHANGES",
  "APPROVED",
  "REJECTED",
  "FLAGGED",
  "SUSPENDED",
  "OUT_OF_STOCK",
]);

export const productImageTypeEnum = pgEnum("product_image_type", [
  "PRIMARY",
  "ANGLE",
  "DETAIL",
  "PART_NUMBER",
  "PACKAGING",
  "OTHER",
]);

export const productImageSourceEnum = pgEnum("product_image_source", [
  "SELLER_ORIGINAL",
  "PLATFORM_ASSISTED_ORIGINAL",
  "BULK_IMPORT_ORIGINAL",
  "ADMIN_APPROVED",
  "ADMIN_REPLACEMENT",
]);

export const productCreationSourceEnum = pgEnum("product_creation_source", [
  "SELLER",
  "PLATFORM_ASSISTED",
  "BULK_IMPORT",
]);

export const inventoryImportStatusEnum = pgEnum("inventory_import_status", [
  "VALIDATING",
  "READY",
  "HAS_ERRORS",
  "IMPORTED",
  "CANCELLED",
]);

export const inventoryImportRowStatusEnum = pgEnum("inventory_import_row_status", [
  "VALID",
  "INVALID",
  "DUPLICATE",
  "IMPORTED",
]);

export const mediaHistoryActionEnum = pgEnum("media_history_action", [
  "UPLOADED",
  "ACTIVATED",
  "DEACTIVATED",
  "REPLACED",
]);

export const inventoryTransactionTypeEnum = pgEnum("inventory_transaction_type", [
  "INITIAL_STOCK",
  "SELLER_ADJUSTMENT",
  "RESERVATION",
  "RESERVATION_RELEASE",
  "SALE",
  "RETURN",
  "ADMIN_ADJUSTMENT",
]);
export const fitmentEvidenceTypeEnum = pgEnum("fitment_evidence_type", [
  "SELLER_CLAIMED",
  "OEM_MATCHED",
  "PLATFORM_VERIFIED",
  "PURCHASE_VERIFIED",
  "BUYER_CONFIRMED",
  "DISPUTED",
  "KNOWN_INCORRECT",
]);
export const fitmentOutcomeStatusEnum = pgEnum("fitment_outcome_status", [
  "FIT_CONFIRMED",
  "FIT_PROBLEM_REPORTED",
  "WRONG_PART",
  "UNCONFIRMED",
  "NOT_APPLICABLE",
]);

export const fitmentEventTypeEnum = pgEnum("fitment_event_type", [
  "SELLER_CLAIM_RECORDED",
  "OEM_MATCHED",
  "PLATFORM_VERIFIED",
  "PURCHASE_COMPLETED",
  "BUYER_CONFIRMED",
  "FIT_PROBLEM_REPORTED",
  "WRONG_PART_REPORTED",
  "DISPUTE_OPENED",
  "INCOMPATIBILITY_RETURN",
  "ADMIN_CORRECTION",
  "OEM_CORRECTION",
  "LISTING_CORRECTION",
  "REPEAT_PURCHASE_CONFIRMED",
]);

export const fitmentTransactionSourceEnum = pgEnum("fitment_transaction_source", [
  "CATALOG_ORDER",
  "RFQ_ACCEPTED_QUOTE",
]);

export const demandEventTypeEnum = pgEnum("demand_event_type", [
  "ZERO_RESULT_SEARCH",
  "ABANDONED_FILTERED_SEARCH",
  "RFQ_CREATED",
  "RFQ_ZERO_QUOTES",
  "RFQ_NO_ACCEPTABLE_QUOTE",
]);
