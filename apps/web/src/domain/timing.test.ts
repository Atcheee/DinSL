import assert from "node:assert/strict";
import test from "node:test";
import { calculateLeaveDecision } from "./timing";
import type { Departure } from "@/api/types";

const departure = (expectedTime: string, overrides: Partial<Departure> = {}): Departure => ({
  id: "d1",
  line: "13",
  destination: "Ropsten",
  expectedTime,
  scheduledTime: expectedTime,
  ...overrides
});

test("returns leave now when walking and buffer consume remaining time", () => {
  const decision = calculateLeaveDecision({
    departures: [departure("2026-07-16T08:10:00+02:00")],
    timingRule: { walkingMinutes: 7, transferBufferMinutes: 3 },
    now: new Date("2026-07-16T08:01:00+02:00")
  });
  assert.equal(decision.state, "leave-now");
});

test("handles midnight rollover using absolute timestamps", () => {
  const decision = calculateLeaveDecision({
    departures: [departure("2026-07-17T00:10:00+02:00")],
    timingRule: { walkingMinutes: 5, transferBufferMinutes: 0 },
    now: new Date("2026-07-16T23:50:00+02:00")
  });
  assert.equal(decision.state, "leave-in");
  assert.equal(decision.state === "leave-in" ? decision.minutes : 0, 15);
});

test("handles Stockholm DST jump through explicit offsets", () => {
  const decision = calculateLeaveDecision({
    departures: [departure("2026-03-29T03:10:00+02:00")],
    timingRule: { walkingMinutes: 7, transferBufferMinutes: 3 },
    now: new Date("2026-03-29T00:50:00+01:00")
  });
  assert.equal(decision.state, "leave-in");
  assert.equal(decision.state === "leave-in" ? decision.minutes : 0, 70);
});

test("marks stale data before making a leave recommendation", () => {
  const decision = calculateLeaveDecision({
    departures: [departure("2026-07-16T08:20:00+02:00")],
    timingRule: { walkingMinutes: 5, transferBufferMinutes: 2 },
    now: new Date("2026-07-16T08:00:00+02:00"),
    fetchedAt: new Date("2026-07-16T07:58:00+02:00")
  });
  assert.equal(decision.state, "stale");
});

test("reports disruption when every relevant departure is cancelled", () => {
  const decision = calculateLeaveDecision({
    departures: [departure("2026-07-16T08:20:00+02:00", { isCancelled: true })],
    timingRule: { walkingMinutes: 5, transferBufferMinutes: 2 },
    now: new Date("2026-07-16T08:00:00+02:00")
  });
  assert.equal(decision.state, "disruption");
});

test("skips avoided lines when choosing the next departure", () => {
  const decision = calculateLeaveDecision({
    departures: [
      departure("2026-07-16T08:10:00+02:00", { line: "4" }),
      departure("2026-07-16T08:18:00+02:00", { line: "13", id: "d2" })
    ],
    timingRule: { walkingMinutes: 5, transferBufferMinutes: 2 },
    avoidedLines: ["4"],
    now: new Date("2026-07-16T08:00:00+02:00")
  });
  assert.equal(decision.state, "leave-in");
  assert.equal(decision.state === "leave-in" ? decision.departure.line : "", "13");
});
