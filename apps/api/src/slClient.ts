import { config } from "./config.js";
import { TtlCache } from "./cache.js";
import { parseJsonPreservingLargeIntegers } from "./jsonPreserveLargeInts.js";
import type {
  Departure,
  SlDepartureResponse,
  SlLinesResponse,
  SlRawDeparture,
  SlSite,
  Stop
} from "./types/sl.js";

const sitesCache = new TtlCache<Stop[]>(config.cacheTtls.sitesMs);
const linesCache = new TtlCache<SlLinesResponse>(config.cacheTtls.linesMs);
const departuresCache = new TtlCache<Departure[]>(config.cacheTtls.departuresMs);

export class UpstreamError extends Error {
  constructor(
    message: string,
    public readonly status = 502,
    public readonly code = "UPSTREAM_ERROR"
  ) {
    super(message);
  }
}

const fetchJson = async <T>(url: string, options?: { preserveLargeIntegers?: boolean }): Promise<T> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);

  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new UpstreamError(`SL API returned ${response.status}`, 502, "SL_API_ERROR");
    }

    if (options?.preserveLargeIntegers) {
      return parseJsonPreservingLargeIntegers<T>(await response.text());
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

const siteGidFromId = (siteId: string) => `9091001${siteId.padStart(9, "0")}`;

const normalizeSite = (site: SlSite): Stop | undefined => {
  if (site.id === undefined || !site.name) return undefined;

  const id = String(site.id);
  // Prefer a string GID; rebuild from site id when JSON.parse rounded a numeric GID.
  const gid = typeof site.gid === "string" ? site.gid : siteGidFromId(id);

  return {
    id,
    name: site.name,
    gid,
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
      const data = await fetchJson<SlSite[]>(`${config.slTransportBaseUrl}/sites?expand=true`, {
        preserveLargeIntegers: true
      });
      return data.map(normalizeSite).filter((site): site is Stop => Boolean(site));
    }),

  getSiteById: async (siteId: string) => {
    const sites = await slClient.getSites();
    return sites.find((site) => site.id === siteId);
  },

  getLines: () =>
    linesCache.getOrSet("lines", () =>
      fetchJson<SlLinesResponse>(`${config.slTransportBaseUrl}/lines?transport_authority_id=1`)
    ),

  getDepartures: (siteId: string) =>
    departuresCache.getOrSet(siteId, async () => {
      const data = await fetchJson<SlDepartureResponse>(
        `${config.slTransportBaseUrl}/sites/${encodeURIComponent(siteId)}/departures`
      );
      return (data.departures ?? []).map(normalizeDeparture);
    })
};
