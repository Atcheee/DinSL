import assert from "node:assert/strict";
import test from "node:test";
import { EnvironmentDisplayRepository } from "./displayRepository";

const config = (extra: Record<string, unknown> = {}) => JSON.stringify([{ id: "screen-1", token: "long-lived-token", siteId: "9192", venueName: "Café", ...extra }]);

test("resolves an opaque display token without returning token material", async () => {
  const repository = new EnvironmentDisplayRepository(config());
  const result = await repository.resolveToken("long-lived-token");
  assert.equal(result.status, "valid");
  if (result.status === "valid") {
    assert.equal(result.display.siteId, "9192");
    assert.equal("token" in result.display, false);
  }
});

test("supports explicit token revocation", async () => {
  const repository = new EnvironmentDisplayRepository(config({ revokedAt: "2026-07-16T08:00:00Z" }));
  assert.equal((await repository.resolveToken("long-lived-token")).status, "revoked");
});

test("rejects expired and unknown tokens", async () => {
  const repository = new EnvironmentDisplayRepository(config({ expiresAt: "2026-07-16T08:00:00Z" }));
  assert.equal((await repository.resolveToken("long-lived-token", new Date("2026-07-16T09:00:00Z"))).status, "expired");
  assert.equal((await repository.resolveToken("unknown")).status, "invalid");
});
