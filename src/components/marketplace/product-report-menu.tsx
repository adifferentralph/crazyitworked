"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { EllipsisVertical, Flag, Store } from "lucide-react";

import {
  submitMarketplaceReportAction,
  type MarketplaceReportState,
} from "@/app/marketplace-report-actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ReportTarget = "PRODUCT" | "MERCHANT";

const reasons: Record<ReportTarget, { label: string; value: string }[]> = {
  PRODUCT: [
    { label: "Misleading product description", value: "MISLEADING_DESCRIPTION" },
    { label: "Counterfeit or suspected fake product", value: "SUSPECTED_COUNTERFEIT" },
    { label: "Incorrect vehicle compatibility", value: "INCORRECT_COMPATIBILITY" },
    { label: "Misleading pricing", value: "MISLEADING_PRICING" },
    { label: "Product unavailable", value: "UNAVAILABLE" },
    { label: "Suspicious or fraudulent listing", value: "SUSPICIOUS_LISTING" },
    { label: "Other", value: "OTHER" },
  ],
  MERCHANT: [
    { label: "Suspected fraudulent merchant", value: "SUSPECTED_FRAUD" },
    { label: "Misleading business information", value: "MISLEADING_BUSINESS_INFORMATION" },
    { label: "Failed order fulfilment", value: "FAILED_FULFILMENT" },
    { label: "Unprofessional conduct", value: "UNPROFESSIONAL_CONDUCT" },
    { label: "Counterfeit product concerns", value: "COUNTERFEIT_CONCERNS" },
    { label: "Suspicious activity", value: "SUSPICIOUS_ACTIVITY" },
    { label: "Other", value: "OTHER" },
  ],
};

function ReportDialog({
  onClose,
  productId,
  productSlug,
  sellerId,
  target,
}: {
  onClose: () => void;
  productId: string;
  productSlug: string;
  sellerId: string;
  target: ReportTarget;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const action = submitMarketplaceReportAction.bind(null, { productId, sellerId, targetType: target });
  const [state, formAction, pending] = useActionState<MarketplaceReportState, FormData>(action, {});

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      aria-labelledby={`report-${target.toLowerCase()}-title`}
      className="w-[min(92vw,32rem)] rounded-xl border border-stone-200 bg-white p-0 shadow-2xl backdrop:bg-black/45"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      ref={dialogRef}
    >
      <form action={formAction} className="p-5 sm:p-6">
        <input name="productSlug" type="hidden" value={productSlug} />
        <h2 className="text-xl font-bold text-stone-950" id={`report-${target.toLowerCase()}-title`}>
          Report {target === "PRODUCT" ? "product" : "merchant"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Tell our moderation team what is wrong. A report does not change a trust score until it is reviewed and upheld.
        </p>
        {state.success ? (
          <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">
            {state.success}
          </p>
        ) : (
          <>
            <label className="mt-5 block text-sm font-bold text-stone-900" htmlFor={`report-reason-${target}`}>
              Reason
            </label>
            <select
              className="mt-2 h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-red-100"
              defaultValue=""
              id={`report-reason-${target}`}
              name="reason"
              required
            >
              <option disabled value="">Choose a reason</option>
              {reasons[target].map((reason) => <option key={reason.value} value={reason.value}>{reason.label}</option>)}
            </select>
            <label className="mt-4 block text-sm font-bold text-stone-900" htmlFor={`report-explanation-${target}`}>
              More details <span className="font-normal text-stone-500">(optional)</span>
            </label>
            <textarea
              className="mt-2 min-h-28 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-red-100"
              id={`report-explanation-${target}`}
              maxLength={2000}
              name="explanation"
            />
            {state.error ? <p className="mt-3 text-sm font-semibold text-red-700" role="alert">{state.error}</p> : null}
          </>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={onClose} type="button" variant="outline">{state.success ? "Close" : "Cancel"}</Button>
          {!state.success ? <Button disabled={pending} type="submit">{pending ? "Sending..." : "Send report"}</Button> : null}
        </div>
      </form>
    </dialog>
  );
}

export function ProductReportMenu({
  productId,
  productSlug,
  sellerId,
}: {
  productId: string;
  productSlug: string;
  sellerId: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [target, setTarget] = useState<ReportTarget | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function closeOnOutside(event: PointerEvent) {
      const targetNode = event.target;
      if (!(targetNode instanceof Node) || !menuRef.current?.contains(targetNode)) setMenuOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  function selectTarget(nextTarget: ReportTarget) {
    setMenuOpen(false);
    setTarget(nextTarget);
  }

  return (
    <>
      <div
        className={cn(
          "absolute right-2 top-2 z-20 opacity-100 transition-opacity",
          "[@media(hover:hover)_and_(pointer:fine)]:opacity-0",
          "[@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100",
          "[@media(hover:hover)_and_(pointer:fine)]:focus-within:opacity-100",
          menuOpen && "opacity-100 [@media(hover:hover)_and_(pointer:fine)]:opacity-100",
        )}
        ref={menuRef}
      >
        <button
          aria-controls={`product-menu-${productId}`}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label="Product reporting options"
          className="grid size-11 place-items-center rounded-full border border-stone-200 bg-white/95 text-stone-800 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          onClick={() => setMenuOpen((open) => !open)}
          type="button"
        >
          <EllipsisVertical aria-hidden="true" className="size-5" />
        </button>
        {menuOpen ? (
          <div
            className="absolute right-0 mt-1 w-48 rounded-md border border-stone-200 bg-white p-1 shadow-lg"
            id={`product-menu-${productId}`}
            role="menu"
          >
            <button className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-stone-100 focus:bg-stone-100 focus:outline-none" onClick={() => selectTarget("PRODUCT")} role="menuitem" type="button">
              <Flag aria-hidden="true" className="size-4" />Report Product
            </button>
            <button className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-stone-100 focus:bg-stone-100 focus:outline-none" onClick={() => selectTarget("MERCHANT")} role="menuitem" type="button">
              <Store aria-hidden="true" className="size-4" />Report Merchant
            </button>
          </div>
        ) : null}
      </div>
      {target ? (
        <ReportDialog
          key={target}
          onClose={() => setTarget(null)}
          productId={productId}
          productSlug={productSlug}
          sellerId={sellerId}
          target={target}
        />
      ) : null}
    </>
  );
}
