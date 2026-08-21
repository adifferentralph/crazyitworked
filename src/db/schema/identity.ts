import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgPolicy,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedRole, authUid, authUsers } from "drizzle-orm/supabase";

import {
  accountStatusEnum,
  addressTypeEnum,
  adminRoleKeyEnum,
  sellerStatusEnum,
  userRoleEnum,
} from "@/db/schema/enums";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    fullName: text("full_name").notNull(),
    phone: text("phone"),
    avatarUrl: text("avatar_url"),
    role: userRoleEnum("role").default("BUYER").notNull(),
    status: accountStatusEnum("status").default("ACTIVE").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("profiles_email_unique").on(sql`lower(${table.email})`),
    index("profiles_role_idx").on(table.role),
    index("profiles_status_idx").on(table.status),
    pgPolicy("profiles_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.id}`,
    }),
    pgPolicy("profiles_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.id}`,
      withCheck: sql`${authUid} = ${table.id}`,
    }),
  ],
).enableRLS();

export const buyerProfiles = pgTable(
  "buyer_profiles",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => profiles.id, { onDelete: "cascade" }),
    preferredMarket: text("preferred_market").default("Nigeria").notNull(),
    ...timestamps,
  },
  (table) => [
    pgPolicy("buyer_profiles_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
    }),
    pgPolicy("buyer_profiles_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
      withCheck: sql`${authUid} = ${table.userId}`,
    }),
  ],
).enableRLS();

export const sellerProfiles = pgTable(
  "seller_profiles",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => profiles.id, { onDelete: "cascade" }),
    storeName: text("store_name").notNull(),
    slug: text("slug").notNull().unique(),
    status: sellerStatusEnum("status").default("PENDING_VERIFICATION").notNull(),
    description: text("description"),
    businessRegistrationNumber: text("business_registration_number"),
    contactPhone: text("contact_phone"),
    websiteUrl: text("website_url"),
    onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
    country: text("country").default("Nigeria").notNull(),
    state: text("state"),
    city: text("city"),
    ...timestamps,
  },
  (table) => [
    index("seller_profiles_status_idx").on(table.status),
    index("seller_profiles_location_idx").on(table.country, table.state, table.city),
    pgPolicy("seller_profiles_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
    }),
    pgPolicy("seller_profiles_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
      withCheck: sql`${authUid} = ${table.userId}`,
    }),
  ],
).enableRLS();

export const adminRoles = pgTable(
  "admin_roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: adminRoleKeyEnum("key").notNull().unique(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  () => [
    pgPolicy("admin_roles_read_authenticated", {
      for: "select",
      to: authenticatedRole,
      using: sql`true`,
    }),
  ],
).enableRLS();

export const permissions = pgTable(
  "permissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull().unique(),
    description: text("description").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  () => [
    pgPolicy("permissions_read_authenticated", {
      for: "select",
      to: authenticatedRole,
      using: sql`true`,
    }),
  ],
).enableRLS();

export const adminRolePermissions = pgTable(
  "admin_role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => adminRoles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.roleId, table.permissionId] }),
    index("admin_role_permissions_permission_idx").on(table.permissionId),
    pgPolicy("admin_role_permissions_read_authenticated", {
      for: "select",
      to: authenticatedRole,
      using: sql`true`,
    }),
  ],
).enableRLS();

export const adminProfiles = pgTable(
  "admin_profiles",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => profiles.id, { onDelete: "cascade" }),
    adminRoleId: uuid("admin_role_id")
      .notNull()
      .references(() => adminRoles.id, { onDelete: "restrict" }),
    jobTitle: text("job_title"),
    ...timestamps,
  },
  (table) => [
    index("admin_profiles_role_idx").on(table.adminRoleId),
    pgPolicy("admin_profiles_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
    }),
  ],
).enableRLS();

export const addresses = pgTable(
  "addresses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    type: addressTypeEnum("type").default("SHIPPING").notNull(),
    label: text("label").notNull(),
    recipientName: text("recipient_name").notNull(),
    phone: text("phone").notNull(),
    line1: text("line_1").notNull(),
    line2: text("line_2"),
    city: text("city").notNull(),
    state: text("state").notNull(),
    country: text("country").default("Nigeria").notNull(),
    postalCode: text("postal_code"),
    isDefault: boolean("is_default").default(false).notNull(),
    ...timestamps,
  },
  (table) => [
    index("addresses_user_idx").on(table.userId),
    index("addresses_location_idx").on(table.country, table.state, table.city),
    pgPolicy("addresses_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
    }),
    pgPolicy("addresses_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUid} = ${table.userId}`,
    }),
    pgPolicy("addresses_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
      withCheck: sql`${authUid} = ${table.userId}`,
    }),
    pgPolicy("addresses_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
    }),
  ],
).enableRLS();

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorUserId: uuid("actor_user_id").references(() => profiles.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    objectType: text("object_type").notNull(),
    objectId: text("object_id").notNull(),
    previousValue: jsonb("previous_value"),
    newValue: jsonb("new_value"),
    reason: text("reason"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata")
      .default(sql`'{}'::jsonb`)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("audit_logs_actor_idx").on(table.actorUserId),
    index("audit_logs_object_idx").on(table.objectType, table.objectId),
    index("audit_logs_created_idx").on(table.createdAt),
  ],
).enableRLS();
