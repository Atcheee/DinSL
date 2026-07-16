import type { DepartureObservation, ReliabilitySummary } from "./models";

export function aggregateReliability(
  observations: DepartureObservation[],
  calculatedAt = new Date()
): ReliabilitySummary {
  const delays = observations.filter((item) => item.type === "delay");
  const delayValues = delays
    .map((item) => item.delayMinutes)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  return {
    totalObservations: observations.length,
    delayedCount: delays.length,
    cancelledCount: observations.filter((item) => item.type === "cancellation").length,
    missingCount: observations.filter((item) => item.type === "missing").length,
    averageDelayMinutes:
      delayValues.length > 0 ? delayValues.reduce((sum, value) => sum + value, 0) / delayValues.length : null,
    calculatedAt: calculatedAt.toISOString()
  };
}
