"use client";

import { LoaderCircle, LockKeyhole } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

export function CheckoutSubmitButton({ disabled = false }: { disabled?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full" disabled={disabled || pending} size="lg" type="submit">
      {pending ? (
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
      ) : (
        <LockKeyhole aria-hidden="true" className="size-4" />
      )}
      {pending ? "Opening secure payment…" : "Pay securely with Kora"}
    </Button>
  );
}
