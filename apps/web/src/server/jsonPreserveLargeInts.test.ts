import assert from "node:assert/strict";
import test from "node:test";
import { parseJsonPreservingLargeIntegers } from "./jsonPreserveLargeInts";

test("preserves SL site GIDs that exceed Number.MAX_SAFE_INTEGER", () => {
  const raw = `[
    {"id": 9115, "gid": 9091001000009115, "name": "Fridhemsplan"},
    {"id": 9116, "gid": 9091001000009116, "name": "Sankt Eriksplan"},
    {"id": 9633, "gid": 9091001000009633, "name": "Roslags Näsby"}
  ]`;

  const parsed = parseJsonPreservingLargeIntegers<
    Array<{ id: number; gid: string; name: string }>
  >(raw);

  assert.equal(parsed[0]?.gid, "9091001000009115");
  assert.equal(parsed[1]?.gid, "9091001000009116");
  assert.equal(parsed[2]?.gid, "9091001000009633");
  assert.notEqual(parsed[0]?.gid, parsed[1]?.gid);
});

test("still parses normal numbers as numbers", () => {
  const parsed = parseJsonPreservingLargeIntegers<{ id: number; lat: number }>(
    '{"id": 9115, "lat": 59.33}'
  );
  assert.equal(parsed.id, 9115);
  assert.equal(typeof parsed.id, "number");
  assert.equal(parsed.lat, 59.33);
});
