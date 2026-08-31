import "server-only";

import { getPublicEnvironment, hasSupabaseEnvironment } from "@/config/env";

export type SocialProviderAvailability = {
  apple: boolean;
  google: boolean;
};

const unavailableProviders: SocialProviderAvailability = {
  apple: false,
  google: false,
};

export async function getSocialProviderAvailability(): Promise<SocialProviderAvailability> {
  if (!hasSupabaseEnvironment()) return unavailableProviders;

  try {
    const environment = getPublicEnvironment();
    const response = await fetch(
      new URL("/auth/v1/settings", environment.NEXT_PUBLIC_SUPABASE_URL),
      {
        headers: {
          apikey: environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        },
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(5_000),
      },
    );

    if (!response.ok) return unavailableProviders;

    const settings = (await response.json()) as {
      external?: {
        apple?: boolean;
        google?: boolean;
      };
    };

    return {
      apple: settings.external?.apple === true,
      google: settings.external?.google === true,
    };
  } catch {
    return unavailableProviders;
  }
}
