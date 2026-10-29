import "server-only";

export type RouteCoordinate = { latitude: number | null; longitude: number | null };

export interface DeliveryDistanceProvider {
  readonly code: string;
  getRoadDistanceMeters(origin: RouteCoordinate, destination: RouteCoordinate): Promise<number | null>;
}

export class GoogleRoutesDistanceProvider implements DeliveryDistanceProvider {
  readonly code = "GOOGLE_ROUTES";

  constructor(private readonly apiKey: string) {}

  async getRoadDistanceMeters(origin: RouteCoordinate, destination: RouteCoordinate) {
    if (
      origin.latitude === null || origin.longitude === null ||
      destination.latitude === null || destination.longitude === null
    ) return null;

    try {
      const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
        body: JSON.stringify({
          destination: { location: { latLng: destination } },
          origin: { location: { latLng: origin } },
          routingPreference: "TRAFFIC_UNAWARE",
          travelMode: "DRIVE",
        }),
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": this.apiKey,
          "X-Goog-FieldMask": "routes.distanceMeters",
        },
        method: "POST",
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) return null;
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== "object") return null;
      const routes = (payload as { routes?: unknown }).routes;
      if (!Array.isArray(routes) || !routes[0] || typeof routes[0] !== "object") return null;
      const distance = (routes[0] as { distanceMeters?: unknown }).distanceMeters;
      return typeof distance === "number" && Number.isInteger(distance) && distance > 0 ? distance : null;
    } catch {
      return null;
    }
  }
}

export function getConfiguredDistanceProvider(): DeliveryDistanceProvider | null {
  const apiKey = process.env.GOOGLE_MAPS_ROUTES_API_KEY?.trim();
  return apiKey ? new GoogleRoutesDistanceProvider(apiKey) : null;
}
