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
