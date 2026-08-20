import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { z } from "zod";

import {
  adminRolePermissions,
  adminRoles,
  permissions,
  type adminRoleKeyEnum,
} from "../src/db/schema";

config({ path: ".env.local" });

const environment = z
  .object({
    DATABASE_URL: z.string().url().startsWith("postgresql://"),
  })
  .parse(process.env);

type AdminRoleKey = (typeof adminRoleKeyEnum.enumValues)[number];

const permissionDefinitions = [
  ["products.read", "View product listings and moderation history"],
  ["products.edit", "Edit product information, images, categories, and fitment"],
  ["products.approve", "Approve, reject, suspend, or request listing changes"],
  ["finance.read", "View payments, balances, ledger entries, and payouts"],
  ["finance.release", "Release eligible held funds"],
  ["finance.payout", "Approve and process seller payouts"],
  ["finance.refund", "Authorize and process refunds"],
  ["disputes.manage", "Review evidence and resolve marketplace disputes"],
  ["sellers.manage", "Review, verify, restrict, and support sellers"],
  ["support.manage", "Access support cases and buyer assistance tools"],
  ["logistics.manage", "Review shipments and fulfillment exceptions"],
  ["content.manage", "Moderate reviews and public marketplace content"],
  ["admin.manage", "Manage administrative users, roles, and permissions"],
  ["audit.read", "Read immutable administrative and financial audit logs"],
  ["settings.manage", "Change sensitive marketplace configuration"],
] as const;

const roleDefinitions: ReadonlyArray<{
  key: AdminRoleKey;
  name: string;
  description: string;
  permissions: ReadonlyArray<(typeof permissionDefinitions)[number][0]> | "ALL";
}> = [
  {
    key: "SUPER_ADMIN",
    name: "Super administrator",
    description: "Full platform authority, reserved for a minimal number of trusted operators.",
    permissions: "ALL",
  },
  {
    key: "OPERATIONS_ADMIN",
    name: "Operations administrator",
    description:
      "Runs cross-functional marketplace operations without administrative-user control.",
    permissions: [
      "products.read",
      "products.edit",
      "products.approve",
      "finance.read",
      "disputes.manage",
      "sellers.manage",
      "support.manage",
      "logistics.manage",
      "audit.read",
    ],
  },
  {
    key: "PRODUCT_MODERATOR",
    name: "Product moderator",
    description: "Manages product data, media, fitment, categories, and approvals.",
    permissions: ["products.read", "products.edit", "products.approve", "audit.read"],
  },
  {
    key: "FINANCE_ADMIN",
    name: "Finance administrator",
    description: "Manages authorized releases, payouts, refunds, and finance records.",
    permissions: [
      "finance.read",
      "finance.release",
      "finance.payout",
      "finance.refund",
      "audit.read",
    ],
  },
  {
    key: "DISPUTE_OFFICER",
    name: "Dispute officer",
    description: "Reviews evidence and resolves buyer and seller disputes.",
    permissions: ["disputes.manage", "finance.read", "products.read", "audit.read"],
  },
  {
    key: "SELLER_MANAGER",
    name: "Seller manager",
    description: "Manages seller verification, performance, and restrictions.",
    permissions: ["sellers.manage", "products.read", "audit.read"],
  },
  {
    key: "SUPPORT_AGENT",
    name: "Support agent",
    description: "Supports buyers and sellers without financial or moderation authority.",
    permissions: ["support.manage", "products.read"],
  },
  {
    key: "LOGISTICS_MANAGER",
    name: "Logistics manager",
    description: "Reviews shipment records and fulfillment exceptions.",
    permissions: ["logistics.manage", "products.read", "audit.read"],
  },
  {
    key: "CONTENT_MODERATOR",
    name: "Content moderator",
    description: "Moderates reviews and public marketplace content.",
    permissions: ["content.manage", "products.read", "audit.read"],
  },
];

async function main() {
  const client = postgres(environment.DATABASE_URL, { max: 1, prepare: false });
  const db = drizzle({ client });

  try {
    await db.transaction(async (transaction) => {
      for (const [code, description] of permissionDefinitions) {
        await transaction
          .insert(permissions)
          .values({ code, description })
          .onConflictDoUpdate({ target: permissions.code, set: { description } });
      }

      for (const role of roleDefinitions) {
        await transaction
          .insert(adminRoles)
          .values({ key: role.key, name: role.name, description: role.description })
          .onConflictDoUpdate({
            target: adminRoles.key,
            set: { name: role.name, description: role.description },
          });
      }

      const storedPermissions = await transaction.select().from(permissions);
      const storedRoles = await transaction.select().from(adminRoles);

      for (const role of roleDefinitions) {
        const storedRole = storedRoles.find((item) => item.key === role.key);
        if (!storedRole) throw new Error(`Seeded role not found: ${role.key}`);

        await transaction
          .delete(adminRolePermissions)
          .where(eq(adminRolePermissions.roleId, storedRole.id));

        const selectedPermissions =
          role.permissions === "ALL"
            ? storedPermissions
            : storedPermissions.filter((permission) =>
                role.permissions.includes(permission.code as never),
              );

        if (selectedPermissions.length > 0) {
          await transaction.insert(adminRolePermissions).values(
            selectedPermissions.map((permission) => ({
              roleId: storedRole.id,
              permissionId: permission.id,
            })),
          );
        }
      }
    });

    console.log("Foundation roles and permissions seeded.");
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error("Foundation seed failed.");
  console.error(error instanceof Error ? error.message : "Unknown seed error");
  process.exitCode = 1;
});
