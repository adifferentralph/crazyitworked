import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const KORA_API_ORIGIN = "https://api.korapay.com";
const REQUEST_TIMEOUT_MS = 15_000;

const environmentSchema = z.object({
  KORA_ENVIRONMENT: z.enum(["test", "live"]).default("test"),
  KORA_SECRET_KEY: z.string().trim().min(20),
});

const initializeResponseSchema = z.object({
  status: z.boolean(),
  message: z.string().optional(),
  data: z
    .object({
      checkout_url: z.string().url(),
      reference: z.string().min(1).optional(),
    })
    .passthrough(),
});

const verificationResponseSchema = z.object({
  status: z.boolean(),
  message: z.string().optional(),
  data: z
    .object({
      amount: z.union([z.number(), z.string()]),
      currency: z.string(),
      reference: z.string().min(1),
      status: z.string().min(1),
    })
    .passthrough(),
});

export type KoraVerification = {
  amountMinor: number;
  currency: string;
  providerStatus: string;
  reference: string;
  successful: boolean;
};

export function hasKoraEnvironment() {
  return Boolean(process.env.KORA_SECRET_KEY);
}

export function getKoraEnvironment() {
  return environmentSchema.parse({
    KORA_ENVIRONMENT: process.env.KORA_ENVIRONMENT,
    KORA_SECRET_KEY: process.env.KORA_SECRET_KEY,
  });
}

export function minorToKoraAmount(amountMinor: number) {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new Error("Payment amount must be a positive safe integer in minor units.");
  }

  return Number((amountMinor / 100).toFixed(2));
}

export function koraAmountToMinor(amount: string | number) {
  const numericAmount = typeof amount === "number" ? amount : Number(amount);
  const amountMinor = Math.round(numericAmount * 100);

  if (!Number.isFinite(numericAmount) || !Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new Error("Kora returned an invalid payment amount.");
  }

  return amountMinor;
}

async function requestKora(path: string, init?: RequestInit) {
  const environment = getKoraEnvironment();
  const response = await fetch(`${KORA_API_ORIGIN}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${environment.KORA_SECRET_KEY}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Kora request failed with HTTP ${response.status}.`);
  }

  return payload;
}

export async function initializeKoraCharge(input: {
  amountMinor: number;
  customer: {
    email: string;
    name: string;
  };
  notificationUrl: string;
  redirectUrl: string;
  reference: string;
}) {
  const payload = await requestKora("/merchant/api/v1/charges/initialize", {
    body: JSON.stringify({
      amount: minorToKoraAmount(input.amountMinor),
      currency: "NGN",
      customer: input.customer,
      notification_url: input.notificationUrl,
      redirect_url: input.redirectUrl,
      reference: input.reference,
    }),
    method: "POST",
  });
  const parsed = initializeResponseSchema.safeParse(payload);

  if (!parsed.success || !parsed.data.status) {
    throw new Error("Kora did not create a checkout session.");
  }

  if (parsed.data.data.reference && parsed.data.data.reference !== input.reference) {
    throw new Error("Kora returned a different payment reference.");
  }

  return {
    checkoutUrl: parsed.data.data.checkout_url,
    providerMessage: parsed.data.message ?? null,
  };
}

export async function verifyKoraCharge(reference: string): Promise<KoraVerification> {
  const payload = await requestKora(
    `/merchant/api/v1/charges/${encodeURIComponent(reference)}`,
    { method: "GET" },
  );
  const parsed = verificationResponseSchema.safeParse(payload);

  if (!parsed.success || !parsed.data.status) {
    throw new Error("Kora could not verify this payment.");
  }

  const data = parsed.data.data;
  const providerStatus = data.status.trim().toLowerCase();

  return {
    amountMinor: koraAmountToMinor(data.amount),
    currency: data.currency.trim().toUpperCase(),
    providerStatus,
    reference: data.reference,
    successful: ["success", "successful", "paid"].includes(providerStatus),
  };
}

export function verifyKoraWebhookSignature(data: unknown, signature: string | null) {
  if (!signature) return false;

  const { KORA_SECRET_KEY } = getKoraEnvironment();
  const expected = createHmac("sha256", KORA_SECRET_KEY)
    .update(JSON.stringify(data))
    .digest("hex");
  const providedBuffer = Buffer.from(signature.trim().toLowerCase(), "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
}
