"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

import logo from "@/components/brand/logo.png";

const DISMISSAL_KEY = "ttp-install-prompt-dismissed-until";
const INSTALLED_KEY = "ttp-install-completed";
const SPLASH_KEY = "ttp-standalone-splash-shown";
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
  const [splashVisible, setSplashVisible] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (
      "serviceWorker" in navigator &&
      (window.isSecureContext || location.hostname === "localhost")
    ) {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" });
    }

    if (isStandalone()) {
      if (!window.sessionStorage.getItem(SPLASH_KEY)) {
        window.sessionStorage.setItem(SPLASH_KEY, "true");
        setSplashVisible(true);
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const timeout = window.setTimeout(() => setSplashVisible(false), reducedMotion ? 200 : 800);
        return () => window.clearTimeout(timeout);
      }
      return;
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setIosInstructions(false);
      if (!dismissalIsActive() && window.localStorage.getItem(INSTALLED_KEY) !== "true") {
        setVisible(true);
      }
    }

    function handleInstalled() {
      setInstallEvent(null);
      setVisible(false);
      window.localStorage.setItem(INSTALLED_KEY, "true");
      window.localStorage.removeItem(DISMISSAL_KEY);
    }

    function handleShowPrompt() {
      if (isStandalone() || dismissalIsActive()) return;
      if (installEvent) {
        setIosInstructions(false);
        setVisible(true);
      } else if (isIosDevice()) {
        setIosInstructions(true);
        setVisible(true);
      }
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    window.addEventListener("ttp:show-install-prompt", handleShowPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      window.removeEventListener("ttp:show-install-prompt", handleShowPrompt);
    };
  }, [installEvent]);

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
      window.localStorage.setItem(INSTALLED_KEY, "true");
    } else {
      dismiss();
    }
  }

  return (
    <>
      {visible && (installEvent || iosInstructions) ? (
        <aside aria-label="Install Twenty-Two Parts" className="border-b border-stone-200 bg-white">
          <div className="container-page flex min-h-16 items-center gap-3 py-2">
            <Image alt="" aria-hidden="true" className="size-10 shrink-0 rounded-lg" height={40} src="/icons/app-icon-192.png" width={40} />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-bold text-stone-950">Install Twenty-Two Parts</h2>
              <p className="truncate text-xs text-stone-500">
                {iosInstructions ? "Use Share, then Add to Home Screen" : "twentytwoparts.com"}
              </p>
            </div>
            {installEvent ? (
              <button className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-xs font-bold text-white hover:bg-red-700" onClick={install} type="button">
                <Download aria-hidden="true" className="size-4" /> Install
              </button>
            ) : (
              <span className="hidden items-center gap-1 text-xs font-semibold text-stone-700 min-[375px]:inline-flex">
                <Share aria-hidden="true" className="size-4" /> Share
              </span>
            )}
            <button aria-label="Dismiss install suggestion" className="grid size-9 shrink-0 place-items-center rounded-md text-stone-500 hover:bg-stone-100 hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" onClick={dismiss} type="button">
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
        </aside>
      ) : null}
      {splashVisible ? (
        <div aria-label="Twenty-Two Parts is opening" className="pwa-launch fixed inset-0 z-[120] grid place-items-center bg-white" role="status">
          <div className="pwa-launch__mark grid place-items-center">
            <Image alt="" aria-hidden="true" className="size-24 object-contain" priority src={logo} />
            <span className="pwa-launch__accent mt-3 h-1 w-16 rounded-full bg-primary" />
          </div>
        </div>
      ) : null}
    </>
  );
}
