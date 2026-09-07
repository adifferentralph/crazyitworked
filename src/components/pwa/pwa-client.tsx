"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

import { Button } from "@/components/ui/button";

const DISMISSAL_KEY = "ttp-install-prompt-dismissed-until";
const DISMISSAL_MS = 30 * 24 * 60 * 60 * 1_000;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function dismissalIsActive() {
  const value = Number(window.localStorage.getItem(DISMISSAL_KEY));
  return Number.isFinite(value) && value > Date.now();
}

export function PwaClient() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosInstructions, setIosInstructions] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (
      "serviceWorker" in navigator &&
      (window.isSecureContext || location.hostname === "localhost")
    ) {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" });
    }

    if (isStandalone()) return;

    const ios = isIosDevice();
    if (ios && !dismissalIsActive()) {
      setIosInstructions(true);
      setVisible(true);
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      if (!dismissalIsActive()) setVisible(true);
    }

    function handleInstalled() {
      setInstallEvent(null);
      setVisible(false);
      window.localStorage.removeItem(DISMISSAL_KEY);
    }

    function handleShowPrompt() {
      if (isStandalone()) return;
      setIosInstructions(isIosDevice());
      setVisible(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    window.addEventListener("ttp:show-install-prompt", handleShowPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      window.removeEventListener("ttp:show-install-prompt", handleShowPrompt);
    };
  }, []);

  function dismiss() {
    window.localStorage.setItem(DISMISSAL_KEY, String(Date.now() + DISMISSAL_MS));
    setVisible(false);
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") {
      setInstallEvent(null);
      setVisible(false);
    }
  }

  if (!visible || (!installEvent && !iosInstructions)) return null;

  return (
    <aside
      aria-label="Install Twenty-Two Parts"
      className="fixed inset-x-4 bottom-4 z-[90] mx-auto max-w-lg rounded-xl border border-stone-200 bg-white p-5 shadow-2xl sm:left-auto sm:right-5 sm:mx-0"
    >
      <button
        aria-label="Dismiss install prompt"
        className="absolute right-3 top-3 grid size-9 place-items-center rounded-md text-stone-500 hover:bg-stone-100 hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
        onClick={dismiss}
        type="button"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
      <div className="flex items-start gap-3 pr-8">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-stone-950 text-white">
          <Download aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2 className="font-semibold text-stone-950">Install Twenty-Two Parts</h2>
          {iosInstructions ? (
            <p className="mt-1 text-sm leading-6 text-stone-600">
              In Safari, tap Share, then choose Add to Home Screen. Open the installed app to enable
              push notifications.
            </p>
          ) : (
            <p className="mt-1 text-sm leading-6 text-stone-600">
              Add the marketplace to this device for faster access. Installation is optional.
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        {iosInstructions ? (
          <span className="inline-flex h-10 items-center gap-2 rounded-md border border-stone-200 px-4 text-sm font-semibold text-stone-800">
            <Share aria-hidden="true" className="size-4" />
            Share, then Add to Home Screen
          </span>
        ) : (
          <Button onClick={install} type="button">
            <Download aria-hidden="true" className="size-4" />
            Install app
          </Button>
        )}
        <Button onClick={dismiss} type="button" variant="ghost">
          Not now
        </Button>
      </div>
    </aside>
  );
}
