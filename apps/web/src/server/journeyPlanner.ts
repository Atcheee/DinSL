import { TtlCache } from "./cache";
import { serverConfig } from "./config";
import { UpstreamError } from "./slClient";
import type { JourneyLeg, JourneyOption } from "@/api/types";
import { MAX_VIA_STOPS, type RoutePreference, type TransportMode } from "@/domain/models";

type SlJourneyLocation = {
  name?: string;
  disassembledName?: string;
  type?: string;
  parent?: { name?: string; disassembledName?: string; type?: string };
};

type SlJourneyInfo = {
  infoLinks?: Array<{ title?: string }>;
  type?: string;
};

type SlJourneyLeg = {
  duration?: number;
  origin?: SlJourneyLocation & {
    departureTimeEstimated?: string;
    departureTimePlanned?: string;
  };
  destination?: SlJourneyLocation & {
    arrivalTimeEstimated?: string;
    arrivalTimePlanned?: string;
  };
  transportation?: {
    disassembledName?: string;
    number?: string;
    product?: { name?: string; class?: number };
    destination?: { name?: string };
  };
  infos?: SlJourneyInfo[];
};

type SlJourney = {
  tripDuration?: number;
  interchanges?: number;
  legs?: SlJourneyLeg[];
};

type SlJourneysResponse = {
  journeys?: SlJourney[];
  systemMessages?: Array<{ type?: string; text?: string; code?: number }>;
};

const journeysCache = new TtlCache<JourneyOption[]>(serverConfig.cacheTtls.journeysMs);

const MOT_BY_MODE: Record<TransportMode, string> = {
  TRAIN: "incl_mot_0",
  METRO: "incl_mot_2",
  TRAM: "incl_mot_4",
  BUS: "incl_mot_5",
  SHIP: "incl_mot_9"
};

const ACCESSIBILITY_HINT =
  /hiss|elevator|rullstol|tillgänglig|handikapp|ramp|trappa|escalator|rulltrappa/i;

const locationName = (location?: SlJourneyLocation) => {
  if (!location) return "Okänd";
  if (location.type === "platform" || location.parent?.type === "stop") {
    return location.parent?.disassembledName ?? location.parent?.name ?? location.name ?? "Okänd";
  }
  return location.disassembledName ?? location.name ?? location.parent?.disassembledName ?? location.parent?.name ?? "Okänd";
};

const collectInfos = (leg: SlJourneyLeg) =>
  (leg.infos ?? [])
    .flatMap((info) => info.infoLinks?.map((link) => link.title?.trim()).filter(Boolean) ?? [])
    .filter((title): title is string => Boolean(title));

const normalizeLeg = (leg: SlJourneyLeg): JourneyLeg => {
  const infos = collectInfos(leg);
  const productName = leg.transportation?.product?.name;
  const line = leg.transportation?.disassembledName ?? leg.transportation?.number;

  return {
    mode: productName,
    line: line ? String(line) : undefined,
    originName: locationName(leg.origin),
    destinationName: locationName(leg.destination),
    departureTime: leg.origin?.departureTimeEstimated ?? leg.origin?.departureTimePlanned,
    arrivalTime: leg.destination?.arrivalTimeEstimated ?? leg.destination?.arrivalTimePlanned,
    durationSeconds: typeof leg.duration === "number" ? leg.duration : undefined,
    infos
  };
};

const normalizeJourney = (journey: SlJourney, index: number): JourneyOption => {
  const legs = (journey.legs ?? []).map(normalizeLeg);
  const accessibilityNotes = legs
    .flatMap((item) => item.infos)
    .filter((note) => ACCESSIBILITY_HINT.test(note));
  const hasBlockingNote = accessibilityNotes.some((note) =>
    /avstängd|ur funktion|stängd|fungerar inte|ej i drift|trasig/i.test(note)
  );

  return {
    id: `journey-${index}-${journey.tripDuration ?? 0}-${journey.interchanges ?? 0}`,
    durationSeconds: journey.tripDuration ?? legs.reduce((sum, item) => sum + (item.durationSeconds ?? 0), 0),
    interchanges: journey.interchanges ?? Math.max(0, legs.length - 1),
    wheelchairFriendly: !hasBlockingNote,
    accessibilityNotes: [...new Set(accessibilityNotes)],
    legs
  };
};

const fetchJson = async <T>(url: string): Promise<T> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), serverConfig.requestTimeoutMs);

  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new UpstreamError(`SL Journey Planner returned ${response.status}`, 502, "SL_API_ERROR");
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof UpstreamError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new UpstreamError("SL Journey Planner request timed out", 504, "SL_API_TIMEOUT");
    }
    throw new UpstreamError("Unable to reach SL Journey Planner");
  } finally {
    clearTimeout(timeout);
  }
};

export type PlanJourneyInput = {
  originGid: string;
  destinationGid: string;
  /** Optional via stop GIDs, in order. SL natively supports one; extras are chained. */
  viaGids?: string[];
  preferredModes?: TransportMode[];
  routePreference?: RoutePreference;
  wheelchairAccessible?: boolean;
  maxChanges?: number;
};

const buildTripParams = (input: PlanJourneyInput & { viaGid?: string }) => {
  const modes = input.preferredModes?.length ? input.preferredModes : (Object.keys(MOT_BY_MODE) as TransportMode[]);
  const params = new URLSearchParams({
    type_origin: "any",
    name_origin: input.originGid,
    type_destination: "any",
    name_destination: input.destinationGid,
    calc_number_of_trips: "3",
    route_type: input.routePreference ?? "leasttime",
    language: "sv",
    gen_c: "false"
  });

  if (input.viaGid) {
    params.set("type_via", "any");
    params.set("name_via", input.viaGid);
  }

  if (typeof input.maxChanges === "number") {
    params.set("max_changes", String(Math.max(0, Math.min(9, input.maxChanges))));
  }

  (Object.keys(MOT_BY_MODE) as TransportMode[]).forEach((mode) => {
    params.set(MOT_BY_MODE[mode], modes.includes(mode) ? "true" : "false");
  });

  params.set("incl_mot_10", input.wheelchairAccessible ? "true" : "false");
  params.set("incl_mot_19", "true");
  params.set("incl_mot_14", "false");

  return params;
};

const fetchTrips = async (params: URLSearchParams, wheelchairAccessible?: boolean) => {
  const cacheKey = params.toString();
  return journeysCache.getOrSet(cacheKey, async () => {
    const data = await fetchJson<SlJourneysResponse>(
      `${serverConfig.slJourneyPlannerBaseUrl}/trips?${params.toString()}`
    );
    const journeys = (data.journeys ?? []).map(normalizeJourney);
    if (journeys.length === 0) {
      const message = data.systemMessages?.find((item) => item.text)?.text;
      throw new UpstreamError(message?.trim() || "Inga reseförslag hittades", 404, "NO_JOURNEYS");
    }
    if (wheelchairAccessible) {
      journeys.sort((a, b) => Number(b.wheelchairFriendly) - Number(a.wheelchairFriendly));
    }
    return journeys;
  });
};

const combineJourneys = (segments: JourneyOption[]): JourneyOption => {
  const legs = segments.flatMap((segment) => segment.legs);
  const accessibilityNotes = [...new Set(segments.flatMap((segment) => segment.accessibilityNotes))];
  return {
    id: `via-${segments.map((segment) => segment.id).join("+")}`,
    durationSeconds: segments.reduce((sum, segment) => sum + segment.durationSeconds, 0),
    interchanges: Math.max(0, legs.length - 1),
    wheelchairFriendly: segments.every((segment) => segment.wheelchairFriendly),
    accessibilityNotes,
    legs
  };
};

const planChained = async (input: PlanJourneyInput, waypoints: string[]) => {
  const segmentOptions: JourneyOption[][] = [];
  for (let index = 0; index < waypoints.length - 1; index += 1) {
    const params = buildTripParams({
      ...input,
      originGid: waypoints[index]!,
      destinationGid: waypoints[index + 1]!,
      viaGid: undefined
    });
    segmentOptions.push(await fetchTrips(params, input.wheelchairAccessible));
  }

  const optionCount = Math.min(3, ...segmentOptions.map((options) => options.length));
  const combined: JourneyOption[] = [];
  for (let optionIndex = 0; optionIndex < optionCount; optionIndex += 1) {
    combined.push(combineJourneys(segmentOptions.map((options) => options[optionIndex]!)));
  }
  return combined;
};

export const journeyPlannerClient = {
  plan: async (input: PlanJourneyInput) => {
    const viaGids = (input.viaGids ?? []).filter(Boolean);
    if (viaGids.length > MAX_VIA_STOPS) {
      throw new UpstreamError(`Högst ${MAX_VIA_STOPS} via-hållplatser tillåtna`, 400, "TOO_MANY_VIAS");
    }

    if (viaGids.length <= 1) {
      const params = buildTripParams({
        ...input,
        viaGid: viaGids[0]
      });
      return fetchTrips(params, input.wheelchairAccessible);
    }

    // SL supports a single name_via; chain segments for additional vias.
    return planChained(input, [input.originGid, ...viaGids, input.destinationGid]);
  }
};
