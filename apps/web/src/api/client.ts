import type { ApiErrorResponse, DeparturesResponse, JourneysResponse, NearbyStop, Stop } from "./types";
import type { RoutePreference, TransportMode } from "@/domain/models";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

const request = async <T>(path: string): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { accept: "application/json" }
  });

  if (!response.ok) {
    let message = "Något gick fel. Försök igen.";
    try {
      const body = (await response.json()) as ApiErrorResponse;
      message = body.error?.message ?? message;
    } catch {
      // Keep the generic message when the response is not JSON.
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
};

export type JourneyQuery = {
  originId: string;
  destinationId: string;
  viaIds?: string[];
  modes?: TransportMode[];
  routePreference?: RoutePreference;
  wheelchairAccessible?: boolean;
  maxChanges?: number;
};

export const apiClient = {
  searchStops: (query: string) => request<Stop[]>(`/api/stops/search?q=${encodeURIComponent(query)}`),
  nearbyStops: (lat: number, lon: number) =>
    request<NearbyStop[]>(`/api/stops/nearby?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`),
  resolveStops: (ids: string[]) =>
    request<{ stops: Stop[] }>(`/api/stops/resolve?ids=${encodeURIComponent(ids.join(","))}`),
  departures: (siteId: string) => request<DeparturesResponse>(`/api/departures/${encodeURIComponent(siteId)}`),
  journeys: (query: JourneyQuery) => {
    const params = new URLSearchParams({
      originId: query.originId,
      destinationId: query.destinationId
    });
    if (query.viaIds?.length) params.set("viaIds", query.viaIds.join(","));
    if (query.modes?.length) params.set("modes", query.modes.join(","));
    if (query.routePreference) params.set("routePreference", query.routePreference);
    if (query.wheelchairAccessible) params.set("wheelchair", "1");
    if (typeof query.maxChanges === "number") params.set("maxChanges", String(query.maxChanges));
    return request<JourneysResponse>(`/api/journeys?${params.toString()}`);
  }
};
