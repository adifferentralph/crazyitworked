import { describe, expect, it } from "vitest";

import {
  COOKIE_CONSENT_VERSION,
  createCookieConsent,
  parseCookieConsent,
} from "@/lib/privacy/cookie-consent";

describe("cookie consent", () => {
  it("rejects missing, malformed, and outdated consent", () => {
    expect(parseCookieConsent(null)).toBeNull();
    expect(parseCookieConsent("{")).toBeNull();
    expect(
      parseCookieConsent(
        JSON.stringify({
          analytics: true,
          marketing: true,
          preferences: true,
          savedAt: new Date().toISOString(),
          version: COOKIE_CONSENT_VERSION - 1,
        }),
      ),
    ).toBeNull();
  });

  it("keeps essential storage enabled separately from optional consent", () => {
    const consent = createCookieConsent({
      analytics: false,
      marketing: false,
      preferences: false,
    });
    expect(consent.essential).toBe(true);
    expect(parseCookieConsent(JSON.stringify(consent))).toEqual(consent);
  });
});
