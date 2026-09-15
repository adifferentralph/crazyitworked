import type { InferSelectModel } from "drizzle-orm";

import type { marketplaceBanners } from "@/db/schema";

type Banner = InferSelectModel<typeof marketplaceBanners>;

function inputDate(value: Date | null | undefined) {
  if (!value) return "";
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function BannerForm({
  action,
  banner,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  banner?: Banner;
  submitLabel: string;
}) {
  return (
    <form action={action} className="grid gap-5 rounded-lg border border-stone-200 bg-white p-5" encType="multipart/form-data">
      {banner ? <input name="id" type="hidden" value={banner.id} /> : null}
      <div className="grid gap-2">
        <label className="text-sm font-bold text-stone-800" htmlFor="banner-title">Title</label>
        <input className="input-base" defaultValue={banner?.title} id="banner-title" maxLength={100} name="title" required />
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-bold text-stone-800" htmlFor="banner-subtitle">Subtitle</label>
        <textarea className="input-base min-h-24 py-3" defaultValue={banner?.subtitle ?? ""} id="banner-subtitle" maxLength={180} name="subtitle" />
      </div>
      {!banner ? (
        <div className="grid gap-2">
          <label className="text-sm font-bold text-stone-800" htmlFor="banner-image">Banner image</label>
          <input accept="image/avif,image/jpeg,image/png,image/webp" className="input-base py-2" id="banner-image" name="image" required type="file" />
          <p className="text-xs text-stone-500">JPG, PNG, WebP or AVIF. Maximum 5 MB.</p>
        </div>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <label className="text-sm font-bold text-stone-800" htmlFor="banner-cta-label">CTA label</label>
          <input className="input-base" defaultValue={banner?.ctaLabel ?? ""} id="banner-cta-label" maxLength={40} name="ctaLabel" />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-bold text-stone-800" htmlFor="banner-cta-url">CTA URL</label>
          <input className="input-base" defaultValue={banner?.ctaUrl ?? ""} id="banner-cta-url" name="ctaUrl" placeholder="/find-a-part" />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="grid gap-2">
          <label className="text-sm font-bold text-stone-800" htmlFor="banner-placement">Placement</label>
          <select className="input-base" defaultValue={banner?.placement ?? "HOME_HERO"} id="banner-placement" name="placement">
            <option value="HOME_HERO">Home hero</option>
            <option value="HOME_MID">Home mid-page</option>
            <option value="CATEGORY">Category</option>
          </select>
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-bold text-stone-800" htmlFor="banner-order">Display order</label>
          <input className="input-base" defaultValue={banner?.displayOrder ?? 0} id="banner-order" min={0} name="displayOrder" type="number" />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <label className="text-sm font-bold text-stone-800" htmlFor="banner-start">Start date</label>
          <input className="input-base" defaultValue={inputDate(banner?.startAt)} id="banner-start" name="startAt" type="datetime-local" />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-bold text-stone-800" htmlFor="banner-end">End date</label>
          <input className="input-base" defaultValue={inputDate(banner?.endAt)} id="banner-end" name="endAt" type="datetime-local" />
        </div>
      </div>
      <button className="h-11 justify-self-start rounded-md bg-primary px-5 text-sm font-bold text-white hover:bg-red-700" type="submit">{submitLabel}</button>
    </form>
  );
}
