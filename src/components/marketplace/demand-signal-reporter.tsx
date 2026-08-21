"use client";

import { useEffect } from "react";

export type DemandSignal = {
  categoryId?: string;
  eventType: "ZERO_RESULT_SEARCH" | "ABANDONED_FILTERED_SEARCH";
  fitmentId?: string;
  location?: string;
  query?: string;
  resultCount: number;
};

function getSessionId() {
  const key = "twenty-two-parts-demand-session";
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.sessionStorage.setItem(key, created);
  return created;
}

export function DemandSignalReporter({ signal }: { signal: DemandSignal }) {
  useEffect(() => {
    const fingerprint = JSON.stringify(signal);
    const storageKey = `twenty-two-parts-demand:${fingerprint}`;
    if (window.sessionStorage.getItem(storageKey)) return;

    const startedAt = Date.now();
    let productOpened = false;
    let sent = false;

    const report = () => {
      if (sent || window.sessionStorage.getItem(storageKey)) return;
      sent = true;
      window.sessionStorage.setItem(storageKey, "sent");
      void fetch("/api/demand", {
        body: JSON.stringify({
          ...signal,
          eventToken: crypto.randomUUID(),
          sessionId: getSessionId(),
        }),
        headers: { "content-type": "application/json" },
        keepalive: true,
        method: "POST",
      });
    };

    if (signal.eventType === "ZERO_RESULT_SEARCH") {
      report();
      return;
    }

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest('a[href^="/parts/"]')) productOpened = true;
    };
    const onPageExit = () => {
      if (!productOpened && Date.now() - startedAt >= 15_000) report();
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("pagehide", onPageExit);
    const timeout = window.setTimeout(onPageExit, 30_000);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("pagehide", onPageExit);
      window.clearTimeout(timeout);
    };
  }, [signal]);

  return null;
}