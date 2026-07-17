export type TimingRule = {
  walkingMinutes: number;
  transferBufferMinutes: number;
};

export type TransportMode = "METRO" | "BUS" | "TRAIN" | "TRAM" | "SHIP";

export type RoutePreference = "leasttime" | "leastinterchange" | "leastwalking";

export type ProfileStop = {
  id: string;
  name: string;
  gid?: string;
};

export type CommuteProfile = {
  id: string;
  name: string;
  originStop: ProfileStop;
  /** Single end station for the commute. */
  destinationStop: ProfileStop;
  /** Optional stops the route must pass through, in order. */
  viaStops: ProfileStop[];
  /**
   * @deprecated Prefer destinationStop. Kept for older local profiles / share links
   * that still encode multiple alternate destinations.
   */
  destinations: ProfileStop[];
  /** @deprecated Prefer destinationStop.name; kept for older local profiles. */
  destinationLabel: string;
  preferredLines: string[];
  avoidedLines: string[];
  preferredModes: TransportMode[];
  routePreference: RoutePreference;
  wheelchairAccessible: boolean;
  timingRule: TimingRule;
  createdAt: string;
  updatedAt: string;
};

export type ObservationType = "delay" | "cancellation" | "missing";

export type DepartureObservation = {
  id: string;
  profileId: string;
  siteId: string;
  departureId?: string;
  line?: string;
  type: ObservationType;
  delayMinutes?: number;
  observedAt: string;
  source: "manual" | "upstream";
};

export type ReliabilitySummary = {
  totalObservations: number;
  delayedCount: number;
  cancelledCount: number;
  missingCount: number;
  averageDelayMinutes: number | null;
  calculatedAt: string;
};

export interface JourneyPlanner {
  plan(input: {
    originId: string;
    destinationId: string;
    viaIds?: string[];
    departureTime?: string;
    preferredModes?: TransportMode[];
    routePreference?: RoutePreference;
    wheelchairAccessible?: boolean;
    maxChanges?: number;
  }): Promise<unknown>;
}

export const ALL_TRANSPORT_MODES: TransportMode[] = ["METRO", "BUS", "TRAIN", "TRAM", "SHIP"];

/** Max via stops in a commute profile / journeys request (limits upstream fan-out). */
export const MAX_VIA_STOPS = 2;

export const isSiteId = (value: string) => /^\d+$/.test(value);

export const TRANSPORT_MODE_LABELS: Record<TransportMode, string> = {
  METRO: "Tunnelbana",
  BUS: "Buss",
  TRAIN: "Pendeltåg",
  TRAM: "Spårvagn",
  SHIP: "Båt"
};

export const ROUTE_PREFERENCE_LABELS: Record<RoutePreference, string> = {
  leasttime: "Snabbast",
  leastinterchange: "Färst byten",
  leastwalking: "Minst gång"
};
