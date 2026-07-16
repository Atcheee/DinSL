import assert from "node:assert/strict";
import test from "node:test";
import { TtlCache } from "./cache";

test("coalesces concurrent cache misses into one upstream request", async () => {
  const cache = new TtlCache<number>(1000);
  let calls = 0;
  let release!: (value: number) => void;
  const gate = new Promise<number>((resolve) => { release = resolve; });
  const loader = () => { calls += 1; return gate; };
  const first = cache.getOrSetWithMetadata("key", loader);
  const second = cache.getOrSetWithMetadata("key", loader);
  assert.equal(calls, 1);
  release(42);
  assert.equal((await first).value, 42);
  assert.equal((await second).value, 42);
});

test("serves stale data immediately while revalidating", async () => {
  let now = 0;
  const cache = new TtlCache<number>(100, 500, () => now);
  cache.set("key", 1);
  now = 101;
  const stale = await cache.getOrSetWithMetadata("key", async () => 2);
  assert.equal(stale.value, 1);
  assert.equal(stale.isStale, true);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(cache.get("key")?.value, 2);
  assert.equal(cache.get("key")?.isStale, false);
});
