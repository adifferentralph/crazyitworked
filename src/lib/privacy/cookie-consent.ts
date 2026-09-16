export const COOKIE_CONSENT_KEY = "ttp-cookie-consent";
export const COOKIE_CONSENT_VERSION = 1;

export type CookieConsent = {
  analytics: boolean;
  essential: true;
  marketing: boolean;
  preferences: boolean;
  savedAt: string;
  version: number;
};

export function createCookieConsent(
  values: Pick<CookieConsent, "analytics" | "marketing" | "preferences">,
): CookieConsent {
  return {
    ...values,
    essential: true,
    savedAt: new Date().toISOString(),
    version: COOKIE_CONSENT_VERSION,
  };
}

export function parseCookieConsent(value: string | null): CookieConsent | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("version" in parsed) ||
      parsed.version !== COOKIE_CONSENT_VERSION ||
      !("analytics" in parsed) ||
      typeof parsed.analytics !== "boolean" ||
      !("marketing" in parsed) ||
      typeof parsed.marketing !== "boolean" ||
      !("preferences" in parsed) ||
      typeof parsed.preferences !== "boolean" ||
      !("savedAt" in parsed) ||
      typeof parsed.savedAt !== "string"
    ) {
      return null;
    }
    return {
      analytics: parsed.analytics,
      essential: true,
      marketing: parsed.marketing,
      preferences: parsed.preferences,
      savedAt: parsed.savedAt,
      version: COOKIE_CONSENT_VERSION,
    };
  } catch {
    return null;
  }
}

export function readCookieConsent() {
  if (typeof window === "undefined") return null;
  return parseCookieConsent(window.localStorage.getItem(COOKIE_CONSENT_KEY));
}

export function persistCookieConsent(consent: CookieConsent) {
  window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
  document.documentElement.dataset.analyticsConsent = String(consent.analytics);
  document.documentElement.dataset.marketingConsent = String(consent.marketing);
  document.documentElement.dataset.preferencesConsent = String(consent.preferences);
  window.dispatchEvent(
    new CustomEvent<CookieConsent>("ttp:consent-changed", { detail: consent }),
  );
}
