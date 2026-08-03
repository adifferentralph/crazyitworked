"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function GlobalSearchBar({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("query", query.trim());
    router.push(`/marketplace${params.size ? `?${params.toString()}` : ""}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full flex-col gap-2 rounded-md border bg-white p-2 shadow-soft sm:flex-row"
    >
      <label className="sr-only" htmlFor="global-search">
        Search automotive parts
      </label>
      <Input
        id="global-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by part name, SKU, OEM number"
        className="h-12 border-0 text-base focus-visible:ring-0"
      />
      <Button type="submit" className="h-12 shrink-0">
        <Search className="size-4" aria-hidden="true" />
        Search
      </Button>
    </form>
  );
}
