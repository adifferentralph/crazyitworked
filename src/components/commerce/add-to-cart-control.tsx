"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { Minus, Plus, ShoppingCart } from "lucide-react";

import {
  addToCartAction,
  type CartMutationState,
} from "@/app/(protected)/commerce-actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AddToCartControl({
  available,
  compact = false,
  initialQuantity = 0,
  productId,
}: {
  available: number;
  compact?: boolean;
  initialQuantity?: number;
  productId: string;
}) {
  const initialState: CartMutationState = {
    message: null,
    quantity: initialQuantity,
    status: "idle",
  };
  const [state, action, pending] = useActionState(addToCartAction, initialState);
  const [quantity, setQuantity] = useState(initialQuantity);

  useEffect(() => {
    setQuantity(state.quantity);
  }, [state.quantity]);

  function update(nextQuantity: number, operation: "increment" | "set" = "set") {
    const previousQuantity = quantity;
    const optimisticQuantity = operation === "increment"
      ? Math.min(available, Math.max(1, quantity + 1))
      : Math.min(available, Math.max(0, nextQuantity));
    setQuantity(optimisticQuantity);

    const formData = new FormData();
    formData.set("operation", operation);
    formData.set("productId", productId);
    formData.set("quantity", String(operation === "increment" ? 1 : optimisticQuantity));
    startTransition(() => {
      action(formData);
    });

    if (available < 1) setQuantity(previousQuantity);
  }

  return (
    <div className={cn("grid gap-1", compact ? "mt-auto pt-3" : "w-full")}>
      <div
        className={cn(
          "grid overflow-hidden rounded-md border transition-[grid-template-columns,background-color,border-color] duration-200",
          quantity > 0
            ? "grid-cols-[2.5rem_minmax(2.5rem,1fr)_2.5rem] border-primary bg-white"
            : "grid-cols-1 border-transparent",
          compact ? "min-h-9" : "min-h-11",
        )}
      >
        {quantity > 0 ? (
          <>
            <button
              aria-label="Decrease quantity"
              className="grid place-items-center text-primary transition-colors hover:bg-red-50 disabled:cursor-wait disabled:opacity-50"
              disabled={pending}
              onClick={() => update(quantity - 1)}
              type="button"
            >
              <Minus aria-hidden="true" className="size-4" />
            </button>
            <output
              aria-live="polite"
              className="grid place-items-center border-x border-red-100 text-sm font-bold text-stone-950"
            >
              {pending ? <span className="size-4 animate-spin rounded-full border-2 border-red-100 border-t-primary" /> : quantity}
            </output>
            <button
              aria-label="Increase quantity"
              className="grid place-items-center text-primary transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={pending || quantity >= available}
              onClick={() => update(quantity + 1)}
              type="button"
            >
              <Plus aria-hidden="true" className="size-4" />
            </button>
          </>
        ) : (
          <Button
            className={cn("w-full", compact && "px-2")}
            disabled={pending || available < 1}
            onClick={() => update(1, "increment")}
            size={compact ? "sm" : "lg"}
            type="button"
          >
            {pending ? (
              <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <ShoppingCart aria-hidden="true" className={compact ? "size-4" : "size-5"} />
            )}
            {compact ? "Add" : "Add to cart"}
          </Button>
        )}
      </div>
      {state.status === "error" && state.message ? (
        <p className="text-xs font-semibold text-red-700" role="alert">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
