export type Stop = {
  id: string;
  name: string;
  gid?: string;
  lat?: number;
  lon?: number;
  modes?: string[];
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
  lat?: number;
  lon?: number;
};

export type SlDepartureResponse = {
  departures?: SlRawDeparture[];
};

export type SlRawDeparture = {
  destination?: string;
  via?: string;
  direction?: string;
  state?: string;
  display?: string;
  scheduled?: string;
  expected?: string;
  journey?: {
    id?: number | string;
    state?: string;
    prediction_state?: string;
  };
  stop_point?: {
    id?: number | string;
    designation?: string;
  };
  line?: {
    id?: number | string;
    designation?: string;
    transport_mode?: string;
  };
  deviations?: Array<{
    id?: number | string;
    message?: string;
  }>;
};
