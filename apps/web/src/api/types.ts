export type Stop = {
  id: string;
  name: string;
  gid?: string;
  lat?: number;
  lon?: number;
  modes?: string[];
};

export type JourneyLeg = {
  mode?: string;
  line?: string;
  originName: string;
  destinationName: string;
  departureTime?: string;
  arrivalTime?: string;
  durationSeconds?: number;
  infos: string[];
};

export type JourneyOption = {
  id: string;
  durationSeconds: number;
  interchanges: number;
  wheelchairFriendly: boolean;
  accessibilityNotes: string[];
  legs: JourneyLeg[];
};

export type JourneysResponse = {
  journeys: JourneyOption[];
  fetchedAt: string;
};

export type NearbyStop = Stop & {
  distanceMeters: number;
};

export type Departure = {
  id: string;
  line: string;
  mode?: string;
  destination: string;
  direction?: string;
  expectedTime?: string;
  scheduledTime?: string;
  displayTime?: string;
  platform?: string;
  status?: string;
  isCancelled?: boolean;
};

export type DeparturesResponse = {
  site: Stop | null;
  departures: Departure[];
  fetchedAt: string;
  isStale?: boolean;
};

export type ApiErrorResponse = {
  error?: {
    message?: string;
    code?: string;
  };
};
