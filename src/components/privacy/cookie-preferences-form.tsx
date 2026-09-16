"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  createCookieConsent,
  persistCookieConsent,
  readCookieConsent,
} from "@/lib/privacy/cookie-consent";

type OptionalConsent = {
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
};

const emptyConsent: OptionalConsent = {
  analytics: false,
  marketing: false,
  preferences: false,
};

export function CookiePreferencesForm() {
  const [values, setValues] = useState<OptionalConsent>(emptyConsent);
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const existing = readCookieConsent();
    if (existing) {
      setValues({
        analytics: existing.analytics,
        marketing: existing.marketing,
        preferences: existing.preferences,
      });
    }
    setReady(true);
  }, []);

  function update(key: keyof OptionalConsent, checked: boolean) {
    setSaved(false);
    setValues((current) => ({ ...current, [key]: checked }));
  }

  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        persistCookieConsent(createCookieConsent(values));
        setSaved(true);
      }}
    >
      <PreferenceRow
        checked
        description="Required for sign-in, security, checkout, and core site operation."
        disabled
        label="Essential"
        onChange={() => undefined}
      />
      <PreferenceRow
        checked={values.preferences}
        description="Remembers optional interface choices such as install-prompt decisions."
        disabled={!ready}
        label="Preferences"
        onChange={(checked) => update("preferences", checked)}
      />
      <PreferenceRow
        checked={values.analytics}
        description="Allows privacy-conscious traffic and product-usage measurement."
        disabled={!ready}
        label="Analytics"
        onChange={(checked) => update("analytics", checked)}
      />
      <PreferenceRow
        checked={values.marketing}
        description="Allows optional marketing technologies if they are added and disclosed."
        disabled={!ready}
        label="Marketing"
        onChange={(checked) => update("marketing", checked)}
      />
      <div>
        <Button disabled={!ready} type="submit">Save preferences</Button>
        <p aria-live="polite" className="mt-3 text-sm font-semibold text-emerald-700">
          {saved ? "Cookie preferences saved." : ""}
        </p>
      </div>
    </form>
  );
}

function PreferenceRow({
  checked,
  description,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  disabled: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-16 items-start gap-4 rounded-lg border border-stone-200 bg-white p-4">
      <input
        checked={checked}
        className="mt-1 size-5 accent-primary"
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span className="min-w-0">
        <span className="font-bold text-stone-950">{label}</span>
        {label === "Essential" ? (
          <span className="ml-2 text-xs font-bold text-stone-500">Always on</span>
        ) : null}
        <span className="mt-1 block text-sm leading-6 text-stone-600">
          {description}
        </span>
      </span>
    </label>
  );
}
