import { TtlCache } from "./cache";
import { serverConfig } from "./config";
import type { Departure, SlDepartureResponse, SlRawDeparture, SlSite, Stop } from "./slTypes";

const sitesCache = new TtlCache<Stop[]>(serverConfig.cacheTtls.sitesMs);
const departuresCache = new TtlCache<Departure[]>(serverConfig.cacheTtls.departuresMs);

export class UpstreamError extends Error {
  constructor(
    message: string,
    public readonly status = 502,
    public readonly code = "UPSTREAM_ERROR"
  ) {
    super(message);
  }
}

const fetchJson = async <T>(url: string): Promise<T> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), serverConfig.requestTimeoutMs);

  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new UpstreamError(`SL API returned ${response.status}`, 502, "SL_API_ERROR");
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof UpstreamError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new UpstreamError("SL API request timed out", 504, "SL_API_TIMEOUT");
    }
    throw new UpstreamError("Unable to reach SL API");
  } finally {
    clearTimeout(timeout);
  }
};

const normalizeSite = (site: SlSite): Stop | undefined => {
  if (site.id === undefined || !site.name) return undefined;

  return {
    id: String(site.id),
    name: site.name,
    lat: typeof site.lat === "number" ? site.lat : undefined,
    lon: typeof site.lon === "number" ? site.lon : undefined,
    modes: []
  };
};

const normalizeDeparture = (departure: SlRawDeparture, index: number): Departure => {
  const line = departure.line?.designation ?? String(departure.line?.id ?? "");
  const destination = departure.via
    ? `${departure.destination ?? "Okänd destination"} via ${departure.via}`
    : departure.destination ?? departure.direction ?? "Okänd destination";
  const state = departure.state ?? departure.journey?.state;
  const deviation = departure.deviations?.find((item) => item.message);
  const isCancelled = state?.toUpperCase().includes("CANCEL") ?? false;

  return {
    id: [
      departure.journey?.id,
      departure.line?.id,
      departure.stop_point?.id,
      departure.scheduled,
      index
    ]
      .filter(Boolean)
      .join("-"),
    line,
    mode: departure.line?.transport_mode,
    destination,
    direction: departure.direction,
    expectedTime: departure.expected,
    scheduledTime: departure.scheduled,
    displayTime: departure.display,
    platform: departure.stop_point?.designation,
    status: isCancelled ? "Inställd" : deviation?.message ?? departure.journey?.prediction_state ?? state,
    isCancelled
  };
};

export const slClient = {
  getSites: () =>
    sitesCache.getOrSet("sites", async () => {
      const data = await fetchJson<SlSite[]>(`${serverConfig.slTransportBaseUrl}/sites?expand=true`);
      return data.map(normalizeSite).filter((site): site is Stop => Boolean(site));
    }),

  getSiteById: async (siteId: string) => {
    const sites = await slClient.getSites();
    return sites.find((site) => site.id === siteId);
  },

  getDepartures: (siteId: string) =>
    departuresCache.getOrSetWithMetadata(siteId, async () => {
      const data = await fetchJson<SlDepartureResponse>(
        `${serverConfig.slTransportBaseUrl}/sites/${encodeURIComponent(siteId)}/departures`
      );
      return (data.departures ?? []).map(normalizeDeparture);
    })
};
