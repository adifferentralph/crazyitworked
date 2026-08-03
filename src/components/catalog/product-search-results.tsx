"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";

import { ProductCard } from "@/components/catalog/product-card";
import type { CatalogHit } from "@/lib/marketplace/types";

type SearchPayload = {
  configured: boolean;
  hits: CatalogHit[];
  page: number;
  nbPages: number;
  nbHits: number;
};

export function ProductSearchResults({ searchParams }: { searchParams: Record<string, string> }) {
  const [hits, setHits] = useState<CatalogHit[]>([]);
  const [page, setPage] = useState(0);
  const [nbPages, setNbPages] = useState(0);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const paramsKey = useMemo(() => JSON.stringify(searchParams), [searchParams]);

  useEffect(() => {
    setHits([]);
    setPage(0);
    setNbPages(0);
    void loadPage(0, true);
  }, [paramsKey]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !loading && page + 1 < nbPages) {
        void loadPage(page + 1, false);
      }
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, page, nbPages, paramsKey]);

  async function loadPage(nextPage: number, replace: boolean) {
    setLoading(true);
    const params = new URLSearchParams(searchParams);
    params.set("page", String(nextPage));
    const response = await fetch(`/api/catalog/search?${params.toString()}`);

    if (!response.ok) {
      setConfigured(false);
      setLoading(false);
      return;
    }

    const payload = (await response.json()) as SearchPayload;
    setConfigured(payload.configured);
    setHits((current) => (replace ? payload.hits : [...current, ...payload.hits]));
    setPage(payload.page);
    setNbPages(payload.nbPages);
    setLoading(false);
  }

  if (!configured) {
    return (
      <div className="rounded-lg border bg-white p-6 text-sm text-muted-foreground">
        Search is unavailable until Algolia environment variables and the products index are
        configured.
      </div>
    );
  }

  if (!loading && hits.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-6 text-sm text-muted-foreground">
        No compatible products matched the current filters.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {hits.map((product) => (
          <ProductCard key={product.objectID} product={product} />
        ))}
      </div>
      <div ref={sentinelRef} className="grid min-h-16 place-items-center">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            Loading parts
          </div>
        ) : null}
      </div>
    </div>
  );
}
