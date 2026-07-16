export type Stop = {
  id: string;
  name: string;
  lat?: number;
  lon?: number;
  modes?: string[];
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
