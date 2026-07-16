export type TimingRule = {
  walkingMinutes: number;
  transferBufferMinutes: number;
};

export type CommuteProfile = {
  id: string;
  name: string;
  originStop: { id: string; name: string };
  destinationLabel: string;
  preferredLines: string[];
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

export type Display = {
  id: string;
  siteId: string;
  venueName?: string;
  preferredLines: string[];
  refreshSeconds: number;
  tokenId: string;
  active: boolean;
};

export type DisplayToken = {
  id: string;
  displayId: string;
  tokenHash: string;
  createdAt: string;
  expiresAt?: string;
  revokedAt?: string;
};

export interface JourneyPlanner {
  plan(input: {
    originId: string;
    destinationId: string;
    departureTime?: string;
  }): Promise<unknown>;
}
