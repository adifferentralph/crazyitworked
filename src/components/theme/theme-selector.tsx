"use client";

import { Moon, Monitor, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type ThemePreference = "dark" | "light" | "system";

const storageKey = "twenty-two-parts-theme";

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "dark" || value === "light" || value === "system";
}

function applyTheme(preference: ThemePreference) {
  const dark =
    preference === "dark" ||
    (preference === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.dataset.theme = preference;
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

export function ThemeSelector({
  compact = false,
  inverse = false,
}: {
  compact?: boolean;
  inverse?: boolean;
}) {
  const [preference, setPreference] = useState<ThemePreference>("system");

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    const initial = isThemePreference(saved) ? saved : "system";
    setPreference(initial);
    applyTheme(initial);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemChange = () => {
      const current = window.localStorage.getItem(storageKey);
      if (!isThemePreference(current) || current === "system") applyTheme("system");
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== storageKey) return;
      const next = isThemePreference(event.newValue) ? event.newValue : "system";
      setPreference(next);
      applyTheme(next);
    };

    media.addEventListener("change", handleSystemChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      media.removeEventListener("change", handleSystemChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const Icon = preference === "light" ? Sun : preference === "dark" ? Moon : Monitor;

  return (
    <label
      className={cn(
        "relative inline-flex h-10 shrink-0 items-center rounded-md border text-sm font-semibold focus-within:ring-2 focus-within:ring-primary",
        inverse
          ? "border-stone-700 bg-black text-white"
          : "border-stone-300 bg-white text-stone-700",
        compact ? "w-10 justify-center" : "gap-2 px-3",
      )}
      title="Choose colour theme"
    >
      <Icon aria-hidden="true" className="size-4" />
      <span className={compact ? "sr-only" : undefined}>Theme</span>
      <select
        aria-label="Colour theme"
        className={cn(
          "cursor-pointer bg-transparent outline-none",
          compact && "absolute inset-0 size-full opacity-0",
        )}
        onChange={(event) => {
          const next = event.target.value;
          if (!isThemePreference(next)) return;
          window.localStorage.setItem(storageKey, next);
          setPreference(next);
          applyTheme(next);
        }}
        value={preference}
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}
