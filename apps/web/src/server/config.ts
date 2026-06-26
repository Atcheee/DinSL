export const serverConfig = {
  slTransportBaseUrl: "https://transport.integration.sl.se/v1",
  requestTimeoutMs: 8000,
  cacheTtls: {
    sitesMs: 6 * 60 * 60 * 1000,
    departuresMs: 20 * 1000
  }
} as const;
