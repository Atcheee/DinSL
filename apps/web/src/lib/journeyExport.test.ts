import assert from "node:assert/strict";
import test from "node:test";
import type { JourneyOption } from "@/api/types";
import {
  buildAppleMapsUrl,
  buildGoogleCalendarUrl,
  buildGoogleMapsUrl,
  buildIcsContent,
  journeySummary,
  toIcalUtc
} from "./journeyExport";

const sampleJourney = (): JourneyOption => ({
  id: "j1",
  durationSeconds: 2220,
  interchanges: 1,
  wheelchairFriendly: true,
  accessibilityNotes: [],
  legs: [
    {
      mode: "Spårvagn",
      line: "28",
      originName: "Roslags Näsby",
      destinationName: "Stockholms östra",
      departureTime: "2026-07-17T19:27:00.000Z",
      arrivalTime: "2026-07-17T19:45:00.000Z",
      durationSeconds: 1080,
      infos: []
    },
    {
      mode: "Gång",
      originName: "Stockholms östra",
      destinationName: "Östra station",
      departureTime: "2026-07-17T19:45:00.000Z",
      arrivalTime: "2026-07-17T19:48:00.000Z",
      durationSeconds: 180,
      infos: []
    },
    {
      mode: "Buss",
      line: "4",
      originName: "Östra station",
      destinationName: "Fridhemsplan",
      departureTime: "2026-07-17T19:50:00.000Z",
      arrivalTime: "2026-07-17T20:04:00.000Z",
      durationSeconds: 840,
      infos: []
    }
  ]
});

test("builds iCal content with summary and times", () => {
  const now = new Date("2026-07-17T18:00:00.000Z");
  const ics = buildIcsContent(sampleJourney(), now);
  assert.ok(ics);
  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /SUMMARY:SL: Roslags Näsby → Fridhemsplan/);
  assert.match(ics, /DTSTART:20260717T192700Z/);
  assert.match(ics, /DTEND:20260717T200400Z/);
  assert.match(ics, /DTSTAMP:20260717T180000Z/);
  assert.match(ics, /Spårvagn 28: Roslags Näsby/);
});

test("builds Google Calendar URL with encoded stop names", () => {
  const url = buildGoogleCalendarUrl(sampleJourney());
  assert.ok(url);
  assert.match(url, /^https:\/\/calendar\.google\.com\/calendar\/render\?/);
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get("action"), "TEMPLATE");
  assert.equal(parsed.searchParams.get("text"), "SL: Roslags Näsby → Fridhemsplan");
  assert.equal(parsed.searchParams.get("dates"), "20260717T192700Z/20260717T200400Z");
  assert.match(parsed.searchParams.get("details") ?? "", /Buss 4/);
});

test("builds Google Maps directions URL with waypoints", () => {
  const url = buildGoogleMapsUrl(sampleJourney());
  assert.ok(url);
  const parsed = new URL(url);
  assert.equal(parsed.origin + parsed.pathname, "https://www.google.com/maps/dir/");
  assert.equal(parsed.searchParams.get("origin"), "Roslags Näsby");
  assert.equal(parsed.searchParams.get("destination"), "Fridhemsplan");
  assert.equal(parsed.searchParams.get("travelmode"), "transit");
  assert.equal(parsed.searchParams.get("waypoints"), "Stockholms östra|Östra station");
});

test("builds Apple Maps directions URL", () => {
  const url = buildAppleMapsUrl(sampleJourney());
  assert.ok(url);
  const parsed = new URL(url);
  assert.equal(parsed.origin, "https://maps.apple.com");
  assert.equal(parsed.searchParams.get("saddr"), "Roslags Näsby");
  assert.equal(parsed.searchParams.get("daddr"), "Fridhemsplan");
  assert.equal(parsed.searchParams.get("dirflg"), "r");
});

test("formats UTC iCal timestamps", () => {
  assert.equal(toIcalUtc(new Date("2026-07-17T19:27:00.000Z")), "20260717T192700Z");
  assert.equal(journeySummary(sampleJourney()), "SL: Roslags Näsby → Fridhemsplan");
});
