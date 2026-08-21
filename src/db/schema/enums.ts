import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["BUYER", "SELLER", "ADMIN"]);
export const buyerAccountTypeEnum = pgEnum("buyer_account_type", [
  "INDIVIDUAL",
  "MECHANIC_TECHNICIAN",
  "GARAGE_WORKSHOP",
  "FLEET_OPERATOR",
  "CORPORATE_BUYER",
]);
export const accountStatusEnum = pgEnum("account_status", ["ACTIVE", "RESTRICTED", "SUSPENDED"]);
export const sellerStatusEnum = pgEnum("seller_status", [
  "PENDING_VERIFICATION",
  "ACTIVE",
  "RESTRICTED",
  "SUSPENDED",
  "REJECTED",
]);
export const addressTypeEnum = pgEnum("address_type", ["SHIPPING", "BILLING", "PICKUP"]);
export const adminRoleKeyEnum = pgEnum("admin_role_key", [
  "SUPER_ADMIN",
  "OPERATIONS_ADMIN",
  "PRODUCT_MODERATOR",
  "FINANCE_ADMIN",
  "DISPUTE_OFFICER",
  "SELLER_MANAGER",
  "SUPPORT_AGENT",
  "LOGISTICS_MANAGER",
  "CONTENT_MODERATOR",
]);
