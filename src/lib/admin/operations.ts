import "server-only";

import { sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";

function normalizeSearch(value?: string) {
  return value?.trim().slice(0, 100) ?? "";
}

export type AdminDashboardMetrics = {
  activeAds: number;
  activeSellers: number;
  buyerCount: number;
  marketplaceProducts: number;
  openDisputes: number | null;
  openRfqs: number;
  ordersRequiringAction: number;
  paymentExceptions: number;
  pendingProducts: number;
  pendingSellerOnboarding: number;
};

function safeInteger(value: unknown) {
  if (typeof value === "bigint") {
    const converted = Number(value);
    return Number.isSafeInteger(converted) ? converted : 0;
  }

  if (typeof value === "number") {
    return Number.isSafeInteger(value) ? value : 0;
  }

  if (typeof value === "string" && /^-?\d+$/.test(value)) {
    const converted = Number(value);
    return Number.isSafeInteger(converted) ? converted : 0;
  }

  return 0;
}

function safeCount(value: unknown) {
  return Math.max(0, safeInteger(value));
}

function normalizeAdminDashboardMetrics(
  row: Record<string, unknown> | undefined,
): AdminDashboardMetrics {
  return {
    activeAds: safeCount(row?.activeAds),
    activeSellers: safeCount(row?.activeSellers),
    buyerCount: safeCount(row?.buyerCount),
    marketplaceProducts: safeCount(row?.marketplaceProducts),
    openDisputes:
      row?.openDisputes === null || row?.openDisputes === undefined
        ? null
        : safeCount(row.openDisputes),
    openRfqs: safeCount(row?.openRfqs),
    ordersRequiringAction: safeCount(row?.ordersRequiringAction),
    paymentExceptions: safeCount(row?.paymentExceptions),
    pendingProducts: safeCount(row?.pendingProducts),
    pendingSellerOnboarding: safeCount(row?.pendingSellerOnboarding),
  };
}

export async function getAdminDashboardMetrics(): Promise<AdminDashboardMetrics> {
  const database = getDatabase();
  const [row] = await database.execute(sql<AdminDashboardMetrics>`
    select
      (select count(*)::int from public.seller_profiles
        where onboarding_completed_at is null or status = 'PENDING_VERIFICATION') as "pendingSellerOnboarding",
      (select count(*)::int from public.products where status = 'PENDING_REVIEW') as "pendingProducts",
      (select count(*)::int from public.orders
        where status in ('PAID', 'PROCESSING') or payment_status = 'FAILED') as "ordersRequiringAction",
      (select count(*)::int from public.part_requests where status = 'OPEN') as "openRfqs",
      null::int as "openDisputes",
      (select count(*)::int from public.seller_profiles where status = 'ACTIVE') as "activeSellers",
      (select count(*)::int from public.buyer_profiles) as "buyerCount",
      (select count(*)::int from public.products where status = 'APPROVED') as "marketplaceProducts",
      (
        (select count(*)::int from public.commerce_payments where status = 'FAILED')
        + (select count(*)::int from public.commerce_webhook_events where processing_status = 'FAILED')
      ) as "paymentExceptions",
      (select count(*)::int from public.marketplace_banners
        where status = 'ACTIVE'
          and (start_at is null or start_at <= now())
          and (end_at is null or end_at > now())) as "activeAds"
  `);

  return normalizeAdminDashboardMetrics(row);
}

export type AdminCustomer = {
  accountStatus: string;
  accountType: string;
  email: string;
  fullName: string;
  joinedAt: Date;
  lastOrderAt: Date | null;
  marketingOptIn: boolean;
  orderCount: number;
  phone: string | null;
  unsubscribedAt: Date | null;
};

export async function getAdminCustomers(searchValue?: string): Promise<AdminCustomer[]> {
  const search = normalizeSearch(searchValue);
  const like = `%${search}%`;
  const database = getDatabase();

  return database.execute(sql<AdminCustomer>`
    select
      profiles.full_name as "fullName",
      profiles.email,
      profiles.phone,
      profiles.status::text as "accountStatus",
      buyer_profiles.account_type::text as "accountType",
      profiles.created_at as "joinedAt",
      buyer_profiles.marketing_opt_in as "marketingOptIn",
      buyer_profiles.marketing_unsubscribed_at as "unsubscribedAt",
      count(orders.id)::int as "orderCount",
      max(orders.created_at) as "lastOrderAt"
    from public.buyer_profiles
    join public.profiles on profiles.id = buyer_profiles.user_id
    left join public.orders on orders.buyer_id = buyer_profiles.user_id
    where (
      ${search} = ''
      or profiles.full_name ilike ${like}
      or profiles.email ilike ${like}
      or coalesce(profiles.phone, '') ilike ${like}
    )
    group by
      profiles.id,
      buyer_profiles.user_id,
      buyer_profiles.account_type,
      buyer_profiles.marketing_opt_in,
      buyer_profiles.marketing_unsubscribed_at
    order by profiles.created_at desc
    limit 100
  `);
}

export type AdminSeller = {
  city: string | null;
  email: string;
  joinedAt: Date;
  onboardingCompletedAt: Date | null;
  productCount: number;
  state: string | null;
  status: string;
  storeName: string;
};

export async function getAdminSellers(searchValue?: string): Promise<AdminSeller[]> {
  const search = normalizeSearch(searchValue);
  const like = `%${search}%`;
  return getDatabase().execute(sql<AdminSeller>`
    select
      seller_profiles.store_name as "storeName",
      profiles.email,
      seller_profiles.status::text,
      seller_profiles.state,
      seller_profiles.city,
      profiles.created_at as "joinedAt",
      seller_profiles.onboarding_completed_at as "onboardingCompletedAt",
      count(products.id)::int as "productCount"
    from public.seller_profiles
    join public.profiles on profiles.id = seller_profiles.user_id
    left join public.products on products.seller_id = seller_profiles.user_id
    where (
      ${search} = ''
      or seller_profiles.store_name ilike ${like}
      or profiles.email ilike ${like}
    )
    group by seller_profiles.user_id, profiles.id
    order by profiles.created_at desc
    limit 100
  `);
}

export type AdminProduct = {
  createdAt: Date;
  name: string;
  priceMinor: number;
  quantity: number;
  sku: string;
  status: string;
  storeName: string;
};

export async function getAdminProducts({
  pendingOnly = false,
  searchValue,
}: {
  pendingOnly?: boolean;
  searchValue?: string;
} = {}): Promise<AdminProduct[]> {
  const search = normalizeSearch(searchValue);
  const like = `%${search}%`;
  return getDatabase().execute(sql<AdminProduct>`
    select
      products.name,
      products.sku,
      products.status::text,
      products.price_minor::int as "priceMinor",
      products.quantity,
      products.created_at as "createdAt",
      seller_profiles.store_name as "storeName"
    from public.products
    join public.seller_profiles on seller_profiles.user_id = products.seller_id
    where (${pendingOnly} = false or products.status = 'PENDING_REVIEW')
      and (
        ${search} = ''
        or products.name ilike ${like}
        or products.sku ilike ${like}
        or seller_profiles.store_name ilike ${like}
      )
    order by products.created_at desc
    limit 100
  `);
}

export type AdminOrder = {
  buyerEmail: string;
  createdAt: Date;
  orderNumber: string;
  paymentStatus: string;
  status: string;
  totalMinor: number;
};

export async function getAdminOrders(searchValue?: string): Promise<AdminOrder[]> {
  const search = normalizeSearch(searchValue);
  const like = `%${search}%`;
  return getDatabase().execute(sql<AdminOrder>`
    select
      orders.order_number as "orderNumber",
      orders.status::text,
      orders.payment_status::text as "paymentStatus",
      orders.total_minor::int as "totalMinor",
      orders.customer_email as "buyerEmail",
      orders.created_at as "createdAt"
    from public.orders
    where ${search} = ''
      or orders.order_number ilike ${like}
      or orders.customer_email ilike ${like}
    order by orders.created_at desc
    limit 100
  `);
}

export type AdminRfq = {
  buyerEmail: string;
  createdAt: Date;
  deliveryCity: string;
  deliveryState: string;
  partName: string;
  status: string;
};

export async function getAdminRfqs(searchValue?: string): Promise<AdminRfq[]> {
  const search = normalizeSearch(searchValue);
  const like = `%${search}%`;
  return getDatabase().execute(sql<AdminRfq>`
    select
      part_requests.part_name as "partName",
      part_requests.status::text,
      part_requests.delivery_state as "deliveryState",
      part_requests.delivery_city as "deliveryCity",
      profiles.email as "buyerEmail",
      part_requests.created_at as "createdAt"
    from public.part_requests
    join public.profiles on profiles.id = part_requests.buyer_id
    where ${search} = ''
      or part_requests.part_name ilike ${like}
      or profiles.email ilike ${like}
    order by part_requests.created_at desc
    limit 100
  `);
}

export type AdminAuditRecord = {
  action: string;
  actorEmail: string | null;
  createdAt: Date;
  objectId: string;
  objectType: string;
  reason: string | null;
};

export async function getAdminAuditRecords(): Promise<AdminAuditRecord[]> {
  return getDatabase().execute(sql<AdminAuditRecord>`
    select
      audit_logs.action,
      audit_logs.object_type as "objectType",
      audit_logs.object_id as "objectId",
      audit_logs.reason,
      audit_logs.created_at as "createdAt",
      profiles.email as "actorEmail"
    from public.audit_logs
    left join public.profiles on profiles.id = audit_logs.actor_user_id
    order by audit_logs.created_at desc
    limit 100
  `);
}

export type AdminSectionMetrics = {
  activeNotifications: number;
  adminRoleCount: number;
  fitmentCount: number;
  heldMinor: number;
  makeCount: number;
  modelCount: number;
  paymentCount: number;
  permissionCount: number;
};

function normalizeAdminSectionMetrics(
  row: Record<string, unknown> | undefined,
): AdminSectionMetrics {
  return {
    activeNotifications: safeCount(row?.activeNotifications),
    adminRoleCount: safeCount(row?.adminRoleCount),
    fitmentCount: safeCount(row?.fitmentCount),
    heldMinor: safeInteger(row?.heldMinor),
    makeCount: safeCount(row?.makeCount),
    modelCount: safeCount(row?.modelCount),
    paymentCount: safeCount(row?.paymentCount),
    permissionCount: safeCount(row?.permissionCount),
  };
}

export async function getAdminSectionMetrics(): Promise<AdminSectionMetrics> {
  const [row] = await getDatabase().execute(sql<AdminSectionMetrics>`
    select
      (select count(*)::int from public.commerce_payments) as "paymentCount",
      coalesce((select sum(
        case when direction = 'CREDIT' then amount_minor else -amount_minor end
      )::bigint from public.seller_ledger_entries where bucket = 'HELD'), 0)::int as "heldMinor",
      (select count(*)::int from public.vehicle_makes where is_active) as "makeCount",
      (select count(*)::int from public.vehicle_models where is_active) as "modelCount",
      (select count(*)::int from public.vehicle_fitments) as "fitmentCount",
      (select count(*)::int from public.notifications) as "activeNotifications",
      (select count(*)::int from public.admin_roles) as "adminRoleCount",
      (select count(*)::int from public.permissions) as "permissionCount"
  `);
  return normalizeAdminSectionMetrics(row);
}

export async function getMarketingAudience(
  searchValue?: string,
  consent: "all" | "opted-in" | "unsubscribed" = "all",
): Promise<AdminCustomer[]> {
  const search = normalizeSearch(searchValue);
  const like = `%${search}%`;
  return getDatabase().execute(sql<AdminCustomer>`
    select
      profiles.full_name as "fullName",
      profiles.email,
      profiles.phone,
      profiles.status::text as "accountStatus",
      buyer_profiles.account_type::text as "accountType",
      profiles.created_at as "joinedAt",
      buyer_profiles.marketing_opt_in as "marketingOptIn",
      buyer_profiles.marketing_unsubscribed_at as "unsubscribedAt",
      count(orders.id)::int as "orderCount",
      max(orders.created_at) as "lastOrderAt"
    from public.buyer_profiles
    join public.profiles on profiles.id = buyer_profiles.user_id
    left join public.orders on orders.buyer_id = buyer_profiles.user_id
    where (
      ${search} = ''
      or profiles.full_name ilike ${like}
      or profiles.email ilike ${like}
    )
      and (
        ${consent} = 'all'
        or (${consent} = 'opted-in' and buyer_profiles.marketing_opt_in and buyer_profiles.marketing_unsubscribed_at is null)
        or (${consent} = 'unsubscribed' and buyer_profiles.marketing_unsubscribed_at is not null)
      )
    group by profiles.id, buyer_profiles.user_id
    order by profiles.created_at desc
    limit 500
  `);
}
