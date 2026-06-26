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

export type SlSite = {
  id?: number | string;
  gid?: number | string;
  name?: string;
  alias?: string[];
  note?: string;
  lat?: number;
  lon?: number;
  stop_areas?: Array<number | string | { id?: number | string; type?: string }>;
};

export type SlLine = {
  id?: number | string;
  designation?: string;
  transport_mode?: string;
  group_of_lines?: string;
};

export type SlLinesResponse = Record<string, SlLine[]>;

export type SlDepartureResponse = {
  departures?: SlRawDeparture[];
  stop_deviations?: SlDeviation[];
};

export type SlRawDeparture = {
  destination?: string;
  via?: string;
  direction?: string;
  direction_code?: number;
  state?: string;
  display?: string;
  scheduled?: string;
  expected?: string;
  journey?: {
    id?: number | string;
    state?: string;
    prediction_state?: string;
  };
  stop_area?: {
    id?: number | string;
    name?: string;
    type?: string;
  };
  stop_point?: {
    id?: number | string;
    name?: string;
    designation?: string;
  };
  line?: SlLine;
  deviations?: SlDeviation[];
};

export type SlDeviation = {
  id?: number | string;
  message?: string;
  importance_level?: number;
};
