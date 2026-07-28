import type { JourneyLeg, JourneyOption } from "@/api/types";

const STORAGE_PREFIX = "dinsl:journey:";

const storageKey = (id: string) => `${STORAGE_PREFIX}${id}`;

const isJourneyLeg = (value: unknown): value is JourneyLeg => {
  if (!value || typeof value !== "object") return false;
  const leg = value as JourneyLeg;
  return (
    typeof leg.originName === "string" &&
    typeof leg.destinationName === "string" &&
    Array.isArray(leg.infos) &&
    leg.infos.every((info) => typeof info === "string")
  );
};

const isJourneyOption = (value: unknown): value is JourneyOption => {
  if (!value || typeof value !== "object") return false;
  const journey = value as JourneyOption;
  return (
    typeof journey.id === "string" &&
    journey.id.length > 0 &&
    typeof journey.durationSeconds === "number" &&
    typeof journey.interchanges === "number" &&
    typeof journey.wheelchairFriendly === "boolean" &&
    Array.isArray(journey.accessibilityNotes) &&
    journey.accessibilityNotes.every((note) => typeof note === "string") &&
    Array.isArray(journey.legs) &&
    journey.legs.length > 0 &&
    journey.legs.every(isJourneyLeg)
  );
};

export function saveJourneySnapshot(journey: JourneyOption): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(storageKey(journey.id), JSON.stringify(journey));
}

export function loadJourneySnapshot(id: string): JourneyOption | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(storageKey(id));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isJourneyOption(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearJourneySnapshot(id: string): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(storageKey(id));
}
