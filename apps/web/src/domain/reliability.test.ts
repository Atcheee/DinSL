import assert from "node:assert/strict";
import test from "node:test";
import { aggregateReliability } from "./reliability";
import type { DepartureObservation } from "./models";

const observation = (type: DepartureObservation["type"], delayMinutes?: number): DepartureObservation => ({
  id: crypto.randomUUID(),
  profileId: "p1",
  siteId: "9192",
  type,
  delayMinutes,
  observedAt: "2026-07-16T08:00:00Z",
  source: "manual"
});

test("aggregates delay, cancellation, missing, and average delay", () => {
  const result = aggregateReliability(
    [observation("delay", 4), observation("delay", 8), observation("cancellation"), observation("missing")],
    new Date("2026-07-16T09:00:00Z")
  );
  assert.deepEqual(result, {
    totalObservations: 4,
    delayedCount: 2,
    cancelledCount: 1,
    missingCount: 1,
    averageDelayMinutes: 6,
    calculatedAt: "2026-07-16T09:00:00.000Z"
  });
});
