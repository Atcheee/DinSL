import type { ApiErrorResponse, DeparturesResponse, NearbyStop, Stop } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

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

export const apiClient = {
  searchStops: (query: string) => request<Stop[]>(`/api/stops/search?q=${encodeURIComponent(query)}`),
  nearbyStops: (lat: number, lon: number) =>
    request<NearbyStop[]>(`/api/stops/nearby?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`),
  departures: (siteId: string) => request<DeparturesResponse>(`/api/departures/${encodeURIComponent(siteId)}`)
};
