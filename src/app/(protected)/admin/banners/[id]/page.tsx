import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { BannerForm } from "@/components/admin/banner-form";
import { getDatabase } from "@/db/client";
import { marketplaceBanners } from "@/db/schema";
import { requireAdminPermission } from "@/lib/auth/permissions";
import { updateBannerAction } from "../actions";

export default async function EditBannerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdminPermission("content.manage", "/admin/banners");
  const { id } = await params;
  const query = await searchParams;
  const [banner] = await getDatabase().select().from(marketplaceBanners).where(eq(marketplaceBanners.id, id)).limit(1);
  if (!banner) notFound();

  return (
    <AdminShell description="Update banner copy, destination, placement and campaign schedule." title="Edit banner">
      {query.error ? <p className="mb-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{query.error}</p> : null}
      <BannerForm action={updateBannerAction} banner={banner} submitLabel="Update banner" />
    </AdminShell>
  );
}
