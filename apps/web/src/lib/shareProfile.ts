import {
  ALL_TRANSPORT_MODES,
  MAX_VIA_STOPS,
  isSiteId,
  type CommuteProfile,
  type ProfileStop,
  type RoutePreference,
  type TransportMode
} from "@/domain/models";

const MAX_STOP_NAME_LENGTH = 120;

export const SHARE_QUERY_PARAM = "share";

/** Compact share payload — omits id/timestamps (regenerated on import). */
export type ShareableProfile = {
  name?: string;
  origin: ProfileStop;
  destination: ProfileStop;
  viaStops?: ProfileStop[];
  /**
   * @deprecated Older share links used destinations[] as alternate end points.
   * Still accepted on decode; first entry becomes destination.
   */
  destinations?: ProfileStop[];
  preferredLines?: string[];
  avoidedLines?: string[];
  preferredModes?: TransportMode[];
  routePreference?: RoutePreference;
  wheelchairAccessible?: boolean;
  walkingMinutes?: number;
  transferBufferMinutes?: number;
};

const ROUTE_PREFERENCES: RoutePreference[] = ["leasttime", "leastinterchange", "leastwalking"];

const toBase64Url = (bytes: Uint8Array) => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const fromBase64Url = (value: string) => {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
};

const isProfileStop = (value: unknown): value is ProfileStop => {
  if (!value || typeof value !== "object") return false;
  const stop = value as ProfileStop;
  return (
    typeof stop.id === "string" &&
    isSiteId(stop.id) &&
    typeof stop.name === "string" &&
    stop.name.trim().length > 0 &&
    stop.name.length <= MAX_STOP_NAME_LENGTH &&
    (stop.gid === undefined || (typeof stop.gid === "string" && stop.gid.length <= 32))
  );
};

const isTransportMode = (value: unknown): value is TransportMode =>
  typeof value === "string" && (ALL_TRANSPORT_MODES as string[]).includes(value);

const isRoutePreference = (value: unknown): value is RoutePreference =>
  typeof value === "string" && (ROUTE_PREFERENCES as string[]).includes(value);

export function toShareableProfile(profile: CommuteProfile): ShareableProfile {
  return {
    name: profile.name,
    origin: profile.originStop,
    destination: profile.destinationStop,
    viaStops: profile.viaStops.length ? profile.viaStops : undefined,
    preferredLines: profile.preferredLines,
    avoidedLines: profile.avoidedLines,
    preferredModes: profile.preferredModes,
    routePreference: profile.routePreference,
    wheelchairAccessible: profile.wheelchairAccessible,
    walkingMinutes: profile.timingRule.walkingMinutes,
    transferBufferMinutes: profile.timingRule.transferBufferMinutes
  };
}

export function encodeShareProfile(profile: CommuteProfile): string {
  const payload = JSON.stringify(toShareableProfile(profile));
  return toBase64Url(new TextEncoder().encode(payload));
}

export function buildShareUrl(profile: CommuteProfile, origin = typeof window !== "undefined" ? window.location.origin : ""): string {
  const url = new URL("/", origin || "http://localhost");
  url.searchParams.set(SHARE_QUERY_PARAM, encodeShareProfile(profile));
  return url.toString();
}

export function parseShareableProfile(raw: unknown): ShareableProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  if (!isProfileStop(data.origin)) return null;
  const origin = data.origin;

  let destination: ProfileStop | undefined;
  let viaStops: ProfileStop[] | undefined;

  if (isProfileStop(data.destination)) {
    destination = data.destination;
    if (Array.isArray(data.viaStops)) {
      if (!data.viaStops.every(isProfileStop)) return null;
      if (data.viaStops.length > MAX_VIA_STOPS) return null;
      viaStops = data.viaStops.slice(0, MAX_VIA_STOPS);
    }
  } else if (Array.isArray(data.destinations) && data.destinations.length > 0) {
    if (!data.destinations.every(isProfileStop)) return null;
    destination = data.destinations[0];
    // Legacy multi-destination shares: keep only the first as end station.
  } else {
    return null;
  }

  if (destination.id === origin.id) return null;
  if (viaStops?.some((stop) => stop.id === origin.id || stop.id === destination.id)) return null;

  const preferredModes = Array.isArray(data.preferredModes)
    ? data.preferredModes.filter(isTransportMode)
    : undefined;
  const routePreference = isRoutePreference(data.routePreference) ? data.routePreference : undefined;

  return {
    name: typeof data.name === "string" ? data.name : undefined,
    origin,
    destination,
    viaStops,
    preferredLines: Array.isArray(data.preferredLines)
      ? data.preferredLines.filter((line): line is string => typeof line === "string")
      : undefined,
    avoidedLines: Array.isArray(data.avoidedLines)
      ? data.avoidedLines.filter((line): line is string => typeof line === "string")
      : undefined,
    preferredModes: preferredModes?.length ? preferredModes : undefined,
    routePreference,
    wheelchairAccessible: typeof data.wheelchairAccessible === "boolean" ? data.wheelchairAccessible : undefined,
    walkingMinutes: typeof data.walkingMinutes === "number" ? data.walkingMinutes : undefined,
    transferBufferMinutes: typeof data.transferBufferMinutes === "number" ? data.transferBufferMinutes : undefined
  };
}

export function decodeShareProfile(encoded: string): ShareableProfile | null {
  try {
    const json = fromBase64Url(encoded.trim());
    return parseShareableProfile(JSON.parse(json) as unknown);
  } catch {
    return null;
  }
}

export function shareableToCommuteProfile(share: ShareableProfile, current?: CommuteProfile | null): CommuteProfile {
  const now = new Date().toISOString();
  const destinationStop = share.destination;
  const viaStops = (share.viaStops ?? []).slice(0, MAX_VIA_STOPS);
  return {
    id: current?.id ?? crypto.randomUUID(),
    name: share.name ?? current?.name ?? "Min vardagsresa",
    originStop: share.origin,
    destinationStop,
    viaStops,
    destinations: [destinationStop, ...viaStops],
    destinationLabel: destinationStop.name,
    preferredLines: share.preferredLines ?? [],
    avoidedLines: share.avoidedLines ?? [],
    preferredModes: share.preferredModes?.length ? share.preferredModes : [...ALL_TRANSPORT_MODES],
    routePreference: share.routePreference ?? "leasttime",
    wheelchairAccessible: Boolean(share.wheelchairAccessible),
    timingRule: {
      walkingMinutes: Math.max(0, Math.min(60, share.walkingMinutes ?? 7)),
      transferBufferMinutes: Math.max(0, Math.min(30, share.transferBufferMinutes ?? 3))
    },
    createdAt: current?.createdAt ?? now,
    updatedAt: now
  };
}

type CatalogStop = Pick<ProfileStop, "id" | "name" | "gid">;

/**
 * Rebind share stops to catalog names/gids so crafted id/name mismatches cannot mislead.
 * Returns null if any stop id is missing from the catalog.
 */
export async function rebindShareStopsToCatalog(
  share: ShareableProfile,
  lookup: (ids: string[]) => Promise<CatalogStop[]>
): Promise<ShareableProfile | null> {
  const ids = [
    share.origin.id,
    share.destination.id,
    ...(share.viaStops ?? []).map((stop) => stop.id)
  ];
  const uniqueIds = [...new Set(ids)];
  const resolved = await lookup(uniqueIds);
  const byId = new Map(resolved.map((stop) => [stop.id, stop]));

  const bind = (stop: ProfileStop): ProfileStop | null => {
    const site = byId.get(stop.id);
    if (!site) return null;
    return { id: site.id, name: site.name, gid: site.gid };
  };

  const origin = bind(share.origin);
  const destination = bind(share.destination);
  if (!origin || !destination) return null;

  const viaStops: ProfileStop[] = [];
  for (const stop of share.viaStops ?? []) {
    const rebound = bind(stop);
    if (!rebound) return null;
    viaStops.push(rebound);
  }

  return { ...share, origin, destination, viaStops: viaStops.length ? viaStops : undefined };
}

export function readShareParam(search = typeof window !== "undefined" ? window.location.search : ""): string | null {
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  const value = params.get(SHARE_QUERY_PARAM);
  return value?.trim() ? value.trim() : null;
}

export function stripShareParamFromUrl() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has(SHARE_QUERY_PARAM)) return;
  url.searchParams.delete(SHARE_QUERY_PARAM);
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, "", next);
}
