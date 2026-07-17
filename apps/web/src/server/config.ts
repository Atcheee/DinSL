export const serverConfig = {
  slTransportBaseUrl: "https://transport.integration.sl.se/v1",
  slJourneyPlannerBaseUrl: "https://journeyplanner.integration.sl.se/v2",
  requestTimeoutMs: 8000,
  cacheTtls: {
    sitesMs: 6 * 60 * 60 * 1000,
    departuresMs: 20 * 1000,
    journeysMs: 30 * 1000
  }
} as const;
