"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

export function QuoteSubmitButton() {
  const { pending } = useFormStatus();
  return <Button disabled={pending} type="submit">{pending ? "Submitting quote..." : "Submit quote"}</Button>;
}