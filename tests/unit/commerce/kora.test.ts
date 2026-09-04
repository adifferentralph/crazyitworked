import { createHmac } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  initializeKoraCharge,
  koraAmountToMinor,
  minorToKoraAmount,
  verifyKoraCharge,
  verifyKoraWebhookSignature,
} from "@/lib/commerce/kora";

const secret = "sk_test_twenty_two_parts_unit_test_secret";

describe("Kora server adapter", () => {
  beforeEach(() => {
    process.env.KORA_ENVIRONMENT = "test";
    process.env.KORA_SECRET_KEY = secret;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.KORA_ENVIRONMENT;
    delete process.env.KORA_SECRET_KEY;
  });

  it("converts canonical NGN minor units without losing kobo", () => {
    expect(minorToKoraAmount(12_345)).toBe(123.45);
    expect(koraAmountToMinor("123.45")).toBe(12_345);
    expect(() => minorToKoraAmount(0)).toThrow();
  });

  it("validates the official data-object HMAC without leaking the secret", () => {
    const data = { amount: 123.45, reference: "TTP-TEST-123", status: "success" };
    const signature = createHmac("sha256", secret)
      .update(JSON.stringify(data))
      .digest("hex");

    expect(verifyKoraWebhookSignature(data, signature)).toBe(true);
    expect(verifyKoraWebhookSignature(data, "0".repeat(64))).toBe(false);
    expect(verifyKoraWebhookSignature(data, null)).toBe(false);
  });

  it("initializes redirect checkout from the server with the exact reference and amount", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            checkout_url: "https://checkout.korapay.com/pay/test-token",
            reference: "TTP-TEST-123",
          },
          message: "Checkout created",
          status: true,
        }),
        { headers: { "Content-Type": "application/json" }, status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await initializeKoraCharge({
      amountMinor: 12_345,
      customer: { email: "buyer@example.com", name: "Buyer Example" },
      notificationUrl: "https://example.com/api/payments/kora/webhook",
      redirectUrl: "https://example.com/checkout/return",
      reference: "TTP-TEST-123",
    });

    expect(result.checkoutUrl).toContain("checkout.korapay.com");
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://api.korapay.com/merchant/api/v1/charges/initialize",
    );
    expect(options.method).toBe("POST");
    expect(JSON.parse(String(options.body))).toMatchObject({
      amount: 123.45,
      currency: "NGN",
      reference: "TTP-TEST-123",
    });
    expect(String(options.body)).not.toContain(secret);
  });

  it("normalizes a successful server-to-server verification", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              amount: 123.45,
              currency: "NGN",
              reference: "TTP-TEST-123",
              status: "success",
            },
            status: true,
          }),
          { headers: { "Content-Type": "application/json" }, status: 200 },
        ),
      ),
    );

    await expect(verifyKoraCharge("TTP-TEST-123")).resolves.toEqual({
      amountMinor: 12_345,
      currency: "NGN",
      providerStatus: "success",
      reference: "TTP-TEST-123",
      successful: true,
    });
  });
});
