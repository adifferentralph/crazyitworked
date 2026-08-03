"use client";

import { useMemo, type ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";

export function AppProviders({ children }: { children: ReactNode }) {
  const convex = useMemo(() => {
    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
      return null;
    }

    return new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL);
  }, []);

  if (!convex) {
    return children;
  }

  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
