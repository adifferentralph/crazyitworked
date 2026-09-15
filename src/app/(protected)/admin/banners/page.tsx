import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUp, Edit3, Pause, Play, Plus, Trash2 } from "lucide-react";
import { asc } from "drizzle-orm";

import { AdminShell } from "@/components/admin/admin-shell";
import { BannerForm } from "@/components/admin/banner-form";
import { getDatabase } from "@/db/client";
import { marketplaceBanners } from "@/db/schema";
import { requireAdminPermission } from "@/lib/auth/permissions";
import { createBannerAction, reorderBannerAction, setBannerStatusAction } from "./actions";

export default async function AdminBannersPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  await requireAdminPermission("content.manage", "/admin/banners");
  const params = await searchParams;
  const banners = await getDatabase().select().from(marketplaceBanners).orderBy(asc(marketplaceBanners.displayOrder), asc(marketplaceBanners.createdAt));

  return (
    <AdminShell description="Create, schedule, pause, reorder and archive responsive marketplace campaigns." title="Ads / Banners">
      {params.error ? <p className="mb-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{params.error}</p> : null}
      {params.message ? <p className="mb-5 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800" role="status">Banner {params.message}.</p> : null}
      <details className="mb-7" open={banners.length === 0}>
        <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-md bg-stone-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-primary">
          <Plus aria-hidden="true" className="size-4" /> Create banner
        </summary>
        <div className="mt-4"><BannerForm action={createBannerAction} submitLabel="Save draft banner" /></div>
      </details>
      <div className="grid gap-4">
        {banners.length === 0 ? <div className="rounded-lg border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-600">No marketplace banners are configured. The marketplace will not show a fake advertisement.</div> : null}
        {banners.map((banner) => (
          <article className="grid gap-4 rounded-lg border border-stone-200 bg-white p-4 md:grid-cols-[180px_minmax(0,1fr)_auto]" key={banner.id}>
            <div className="relative aspect-[16/7] overflow-hidden rounded-md bg-stone-100 md:aspect-[4/3]">
              <Image alt="" className="object-cover" fill sizes="180px" src={banner.imageUrl} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold text-stone-950">{banner.title}</h2>
                <span className="rounded-full bg-stone-100 px-2 py-1 text-xs font-bold text-stone-700">{banner.status}</span>
              </div>
              <p className="mt-1 text-sm text-stone-600">{banner.subtitle || "No subtitle"}</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-stone-600">
                <div><dt className="font-bold text-stone-800">Placement</dt><dd>{banner.placement.replaceAll("_", " ")}</dd></div>
                <div><dt className="font-bold text-stone-800">Order</dt><dd>{banner.displayOrder}</dd></div>
                <div><dt className="font-bold text-stone-800">Starts</dt><dd>{banner.startAt?.toLocaleString("en-NG") ?? "Immediately"}</dd></div>
                <div><dt className="font-bold text-stone-800">Ends</dt><dd>{banner.endAt?.toLocaleString("en-NG") ?? "No end date"}</dd></div>
              </dl>
            </div>
            <div className="flex flex-wrap items-start gap-2 md:max-w-36 md:justify-end">
              <Link aria-label={`Edit ${banner.title}`} className="grid size-9 place-items-center rounded-md border border-stone-300 hover:border-primary hover:text-primary" href={`/admin/banners/${banner.id}`}><Edit3 aria-hidden="true" className="size-4" /></Link>
              {banner.status !== "ARCHIVED" ? (
                <form action={setBannerStatusAction}>
                  <input name="id" type="hidden" value={banner.id} />
                  <input name="status" type="hidden" value={banner.status === "ACTIVE" ? "PAUSED" : "ACTIVE"} />
                  <button aria-label={banner.status === "ACTIVE" ? `Pause ${banner.title}` : `Activate ${banner.title}`} className="grid size-9 place-items-center rounded-md border border-stone-300 hover:border-primary hover:text-primary" type="submit">{banner.status === "ACTIVE" ? <Pause aria-hidden="true" className="size-4" /> : <Play aria-hidden="true" className="size-4" />}</button>
                </form>
              ) : null}
              {(["up", "down"] as const).map((direction) => (
                <form action={reorderBannerAction} key={direction}>
                  <input name="id" type="hidden" value={banner.id} />
                  <input name="direction" type="hidden" value={direction} />
                  <button aria-label={`Move ${banner.title} ${direction}`} className="grid size-9 place-items-center rounded-md border border-stone-300 hover:border-primary hover:text-primary" type="submit">{direction === "up" ? <ArrowUp aria-hidden="true" className="size-4" /> : <ArrowDown aria-hidden="true" className="size-4" />}</button>
                </form>
              ))}
              {banner.status !== "ARCHIVED" ? (
                <form action={setBannerStatusAction}>
                  <input name="id" type="hidden" value={banner.id} />
                  <input name="status" type="hidden" value="ARCHIVED" />
                  <button aria-label={`Archive ${banner.title}`} className="grid size-9 place-items-center rounded-md border border-stone-300 hover:border-primary hover:text-primary" type="submit"><Trash2 aria-hidden="true" className="size-4" /></button>
                </form>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
