import assert from "node:assert/strict";
import test from "node:test";
import type { CommuteProfile } from "@/domain/models";
import {
  buildShareUrl,
  decodeShareProfile,
  encodeShareProfile,
  rebindShareStopsToCatalog,
  shareableToCommuteProfile
} from "./shareProfile";

const sampleProfile = (): CommuteProfile => ({
  id: "profile-1",
  name: "Min vardagsresa",
  originStop: { id: "9192", name: "Slussen", gid: "9091001000009192" },
  destinationStop: { id: "9001", name: "T-Centralen", gid: "9091001000009001" },
  viaStops: [{ id: "9119", name: "Odenplan", gid: "9091001000009119" }],
  destinations: [
    { id: "9001", name: "T-Centralen", gid: "9091001000009001" },
    { id: "9119", name: "Odenplan", gid: "9091001000009119" }
  ],
  destinationLabel: "T-Centralen",
  preferredLines: ["13"],
  avoidedLines: ["19"],
  preferredModes: ["METRO", "BUS"],
  routePreference: "leastinterchange",
  wheelchairAccessible: true,
  timingRule: { walkingMinutes: 8, transferBufferMinutes: 2 },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
});

test("round-trips commute profile through share encoding", () => {
  const encoded = encodeShareProfile(sampleProfile());
  const shared = decodeShareProfile(encoded);
  assert.ok(shared);
  assert.equal(shared.origin.name, "Slussen");
  assert.equal(shared.destination.name, "T-Centralen");
  assert.equal(shared.viaStops?.[0]?.name, "Odenplan");
  assert.deepEqual(shared.preferredLines, ["13"]);
  assert.equal(shared.routePreference, "leastinterchange");
  assert.equal(shared.wheelchairAccessible, true);
});

test("builds a share URL with the share query param", () => {
  const url = buildShareUrl(sampleProfile(), "https://example.test");
  assert.match(url, /^https:\/\/example\.test\/\?share=/);
});

test("imports shared profile into a commute profile", () => {
  const shared = decodeShareProfile(encodeShareProfile(sampleProfile()));
  assert.ok(shared);
  const imported = shareableToCommuteProfile(shared);
  assert.equal(imported.originStop.id, "9192");
  assert.equal(imported.destinationStop.gid, "9091001000009001");
  assert.equal(imported.viaStops[0]?.id, "9119");
  assert.equal(imported.timingRule.walkingMinutes, 8);
  assert.notEqual(imported.id, "profile-1");
});

test("decodes legacy destinations[] share payloads", () => {
  const legacy = {
    origin: { id: "9192", name: "Slussen", gid: "9091001000009192" },
    destinations: [{ id: "9001", name: "T-Centralen", gid: "9091001000009001" }],
    preferredLines: ["13"]
  };
  const encoded = Buffer.from(JSON.stringify(legacy)).toString("base64url");
  const shared = decodeShareProfile(encoded);
  assert.ok(shared);
  assert.equal(shared.destination.name, "T-Centralen");
  assert.equal(shared.viaStops, undefined);
});

test("rejects invalid share payloads", () => {
  assert.equal(decodeShareProfile("not-valid"), null);
  assert.equal(decodeShareProfile(Buffer.from("{}").toString("base64url")), null);
});

test("rejects non-numeric stop ids in share payloads", () => {
  const malicious = {
    origin: { id: "label:fake", name: "Slussen" },
    destination: { id: "9001", name: "T-Centralen" }
  };
  assert.equal(decodeShareProfile(Buffer.from(JSON.stringify(malicious)).toString("base64url")), null);
});

test("rejects too many via stops in share payloads", () => {
  const oversized = {
    origin: { id: "9192", name: "Slussen" },
    destination: { id: "9001", name: "T-Centralen" },
    viaStops: [
      { id: "9119", name: "Odenplan" },
      { id: "9112", name: "Fridhemsplan" },
      { id: "9206", name: "Sundbyberg" }
    ]
  };
  assert.equal(decodeShareProfile(Buffer.from(JSON.stringify(oversized)).toString("base64url")), null);
});

test("rebinds share stop names from catalog lookup", async () => {
  const crafted = {
    origin: { id: "9192", name: "Totally Not Slussen" },
    destination: { id: "9001", name: "Fake Central" }
  };
  const shared = decodeShareProfile(Buffer.from(JSON.stringify(crafted)).toString("base64url"));
  assert.ok(shared);
  const rebound = await rebindShareStopsToCatalog(shared, async () => [
    { id: "9192", name: "Slussen", gid: "9091001000009192" },
    { id: "9001", name: "T-Centralen", gid: "9091001000009001" }
  ]);
  assert.ok(rebound);
  assert.equal(rebound.origin.name, "Slussen");
  assert.equal(rebound.destination.name, "T-Centralen");
});

test("rejects share rebind when catalog is missing a stop", async () => {
  const shared = decodeShareProfile(encodeShareProfile(sampleProfile()));
  assert.ok(shared);
  const rebound = await rebindShareStopsToCatalog(shared, async () => [
    { id: "9192", name: "Slussen", gid: "9091001000009192" }
  ]);
  assert.equal(rebound, null);
});
