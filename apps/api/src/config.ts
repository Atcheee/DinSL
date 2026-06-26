const numberFromEnv = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const config = {
  port: numberFromEnv(process.env.PORT, 8000),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  slTransportBaseUrl: "https://transport.integration.sl.se/v1",
  slJourneyPlannerBaseUrl: "https://journeyplanner.integration.sl.se/v2",
  requestTimeoutMs: 8000,
  cacheTtls: {
    sitesMs: 6 * 60 * 60 * 1000,
    linesMs: 6 * 60 * 60 * 1000,
    departuresMs: 20 * 1000
  }
} as const;
