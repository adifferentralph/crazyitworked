"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

export function CheckoutSubmitButton({ disabled = false }: { disabled?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full" disabled={disabled || pending} size="lg" type="submit">
      {pending ? (
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
      ) : (
        <ArrowRight aria-hidden="true" className="size-4" />
      )}
      {pending ? "Processing..." : "Proceed"}
    </Button>
  );
}
