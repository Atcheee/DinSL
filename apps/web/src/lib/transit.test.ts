import assert from "node:assert/strict";
import test from "node:test";
import { getTransitAppearance, transitKind, transitLineNumber } from "./transit";

test("normalizes SL transit modes from API labels", () => {
  assert.equal(transitKind("Tunnelbana"), "metro");
  assert.equal(transitKind("TRAIN"), "train");
  assert.equal(transitKind("Spårvagn"), "tram");
  assert.equal(transitKind("BUS"), "bus");
  assert.equal(transitKind("Ferry"), "ship");
  assert.equal(transitKind("footpath"), "walk");
});

test("extracts line numbers from decorated API values", () => {
  assert.equal(transitLineNumber("T14"), "14");
  assert.equal(transitLineNumber("Spårvagn 27"), "27");
  assert.equal(transitLineNumber("43X"), "43X");
});

test("maps metro, commuter and local rail lines to their visual families", () => {
  assert.equal(getTransitAppearance("Tunnelbana", "11").backgroundColor, "#009FE3");
  assert.equal(getTransitAppearance("Tunnelbana", "14").backgroundColor, "#E31B36");
  assert.equal(getTransitAppearance("Tunnelbana", "18").backgroundColor, "#00A651");
  assert.equal(getTransitAppearance("Pendeltåg", "43").backgroundColor, "#E84A92");
  assert.equal(getTransitAppearance("Spårvagn", "27").backgroundColor, "#A957A1");
  assert.equal(getTransitAppearance("Spårvagn", "30").backgroundColor, "#ED8B24");
});

test("keeps blue and red bus identities distinct", () => {
  assert.equal(getTransitAppearance("Buss", "4").backgroundColor, "#003E9A");
  assert.equal(getTransitAppearance("Buss", "474").backgroundColor, "#003E9A");
  assert.equal(getTransitAppearance("Buss", "27").backgroundColor, "#A4112C");
});
