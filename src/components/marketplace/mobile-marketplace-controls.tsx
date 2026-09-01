"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowUpDown, Filter, X } from "lucide-react";

import {
  MarketplaceFilterFields,
  MarketplaceSearchHiddenInputs,
  type MarketplaceOptions,
} from "@/components/marketplace/marketplace-filter-fields";
import { Button } from "@/components/ui/button";
import type { MarketplaceSearch } from "@/lib/marketplace/search-options";

const dialogClass =
  "fixed inset-y-0 right-0 m-0 h-dvh max-h-none w-[min(28rem,100%)] max-w-none overflow-y-auto border-0 bg-white p-0 text-stone-950 shadow-2xl backdrop:bg-black/45";

export function MobileMarketplaceControls({
  actionPath,
  lockedCategoryId,
  options,
  search,
}: {
  actionPath: string;
  lockedCategoryId?: string;
  options: MarketplaceOptions;
  search: MarketplaceSearch;
}) {
  const filterDialog = useRef<HTMLDialogElement>(null);
  const sortDialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-2 lg:hidden">
        <Button
          className="w-full"
          onClick={() => filterDialog.current?.showModal()}
          type="button"
          variant="outline"
        >
          <Filter aria-hidden="true" className="size-4" />
          Filter
        </Button>
        <Button
          className="w-full"
          onClick={() => sortDialog.current?.showModal()}
          type="button"
          variant="outline"
        >
          <ArrowUpDown aria-hidden="true" className="size-4" />
          Sort
        </Button>
      </div>

      <dialog
        aria-labelledby="mobile-filter-title"
        className={dialogClass}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        ref={filterDialog}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white px-5 py-4">
          <h2
            className="font-body text-lg font-bold text-stone-950"
            id="mobile-filter-title"
          >
            Filter parts
          </h2>
          <button
            aria-label="Close filters"
            className="grid size-10 place-items-center rounded-md border border-stone-300 text-stone-700 focus-visible:ring-2 focus-visible:ring-primary"
            onClick={() => filterDialog.current?.close()}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <form action={actionPath} className="grid gap-5 p-5" method="get">
          <MarketplaceFilterFields
            lockedCategoryId={lockedCategoryId}
            options={options}
            search={search}
          />
          <div className="sticky bottom-0 grid grid-cols-2 gap-3 border-t border-stone-200 bg-white pt-4">
            <Button asChild variant="outline">
              <Link href={actionPath}>Clear</Link>
            </Button>
            <Button type="submit">Apply filters</Button>
          </div>
        </form>
      </dialog>

      <dialog
        aria-labelledby="mobile-sort-title"
        className={dialogClass}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        ref={sortDialog}
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
          <h2
            className="font-body text-lg font-bold text-stone-950"
            id="mobile-sort-title"
          >
            Sort parts
          </h2>
          <button
            aria-label="Close sort"
            className="grid size-10 place-items-center rounded-md border border-stone-300 text-stone-700 focus-visible:ring-2 focus-visible:ring-primary"
            onClick={() => sortDialog.current?.close()}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <form action={actionPath} className="grid gap-5 p-5" method="get">
          <MarketplaceSearchHiddenInputs
            exclude={["category"]}
            search={search}
          />
          {lockedCategoryId ? (
            <input
              name="category"
              type="hidden"
              value={lockedCategoryId}
            />
          ) : search.category ? (
            <input name="category" type="hidden" value={search.category} />
          ) : null}
          <label className="text-sm font-semibold text-stone-700">
            Sort by
            <select
              className="mt-2 h-12 w-full rounded-md border border-stone-300 bg-white px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
              defaultValue={search.sort}
              name="sort"
            >
              <option value="relevance">Relevance</option>
              <option value="newest">Newest</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
            </select>
          </label>
          <Button type="submit">Apply sort</Button>
        </form>
      </dialog>
    </>
  );
}
