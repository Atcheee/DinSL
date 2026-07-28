import assert from "node:assert/strict";
import test from "node:test";
import type { JourneyOption } from "@/api/types";
import {
  clearJourneySnapshot,
  loadJourneySnapshot,
  saveJourneySnapshot
} from "./journeyStorage";

const sampleJourney = (): JourneyOption => ({
  id: "j1",
  durationSeconds: 720,
  interchanges: 0,
  wheelchairFriendly: true,
  accessibilityNotes: [],
  legs: [
    {
      mode: "Tunnelbana",
      line: "13",
      originName: "Slussen",
      destinationName: "T-Centralen",
      departureTime: "2026-07-17T20:08:00.000Z",
      arrivalTime: "2026-07-17T20:20:00.000Z",
      durationSeconds: 720,
      infos: []
    }
  ]
});

const memory = new Map<string, string>();

const installSessionStorage = () => {
  const storage = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
    removeItem: (key: string) => {
      memory.delete(key);
    }
  };
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: storage
  });
};

test.beforeEach(() => {
  memory.clear();
  installSessionStorage();
});

test("round-trips a journey snapshot through sessionStorage", () => {
  const journey = sampleJourney();
  saveJourneySnapshot(journey);
  assert.deepEqual(loadJourneySnapshot("j1"), journey);
});

test("returns null for missing or invalid snapshots", () => {
  assert.equal(loadJourneySnapshot("missing"), null);

  sessionStorage.setItem("dinsl:journey:bad", "{not-json");
  assert.equal(loadJourneySnapshot("bad"), null);

  sessionStorage.setItem("dinsl:journey:empty-legs", JSON.stringify({ ...sampleJourney(), legs: [] }));
  assert.equal(loadJourneySnapshot("empty-legs"), null);
});

test("clears a stored snapshot", () => {
  saveJourneySnapshot(sampleJourney());
  clearJourneySnapshot("j1");
  assert.equal(loadJourneySnapshot("j1"), null);
});
