import assert from "node:assert/strict";
import test from "node:test";
import { buildTripParams, type PlanJourneyInput } from "./journeyPlanner";

const baseInput: PlanJourneyInput = {
  originGid: "9091001000009192",
  destinationGid: "9091001000009001"
};

test("omits date and time when searching for a journey now", () => {
  const params = buildTripParams({ ...baseInput, searchMode: "now" });

  assert.equal(params.get("calc_number_of_trips"), "3");
  assert.equal(params.get("calc_one_direction"), "true");
  assert.equal(params.has("itd_date"), false);
  assert.equal(params.has("itd_time"), false);
  assert.equal(params.has("itd_trip_date_time_dep_arr"), false);
});

test("formats a selected departure date and time for SL", () => {
  const params = buildTripParams({
    ...baseInput,
    searchMode: "departure",
    searchDate: "2026-08-03",
    searchTime: "07:45"
  });

  assert.equal(params.get("itd_date"), "20260803");
  assert.equal(params.get("itd_time"), "0745");
  assert.equal(params.get("itd_trip_date_time_dep_arr"), "dep");
});

test("marks selected time as an arrival search", () => {
  const params = buildTripParams({
    ...baseInput,
    searchMode: "arrival",
    searchDate: "2026-12-24",
    searchTime: "18:05"
  });

  assert.equal(params.get("itd_date"), "20261224");
  assert.equal(params.get("itd_time"), "1805");
  assert.equal(params.get("itd_trip_date_time_dep_arr"), "arr");
});
