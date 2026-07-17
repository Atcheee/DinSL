import type { Departure } from "@/api/types";
import type { TimingRule } from "./models";

export type LeaveDecision =
  | { state: "insufficient"; label: string; detail: string }
  | { state: "stale"; label: string; detail: string }
  | { state: "disruption"; label: string; detail: string; departure?: Departure }
  | { state: "leave-now"; label: string; detail: string; departure: Departure; leaveAt: string }
  | { state: "leave-in"; label: string; detail: string; departure: Departure; leaveAt: string; minutes: number };

const departureDate = (departure: Departure) => {
  const value = departure.expectedTime ?? departure.scheduledTime;
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

export function calculateLeaveDecision(input: {
  departures: Departure[];
  timingRule: TimingRule;
  preferredLines?: string[];
  avoidedLines?: string[];
  now: Date;
  fetchedAt?: Date;
  staleAfterMs?: number;
}): LeaveDecision {
  const { departures, timingRule, now } = input;
  const staleAfterMs = input.staleAfterMs ?? 60_000;

  if (input.fetchedAt && now.getTime() - input.fetchedAt.getTime() > staleAfterMs) {
    return { state: "stale", label: "Kontrollera avgången", detail: "Trafikdatan är äldre än en minut." };
  }

  const preferred = new Set((input.preferredLines ?? []).map((line) => line.trim()).filter(Boolean));
  const avoided = new Set((input.avoidedLines ?? []).map((line) => line.trim()).filter(Boolean));
  const relevant = departures
    .filter((departure) => !avoided.has(departure.line))
    .filter((departure) => preferred.size === 0 || preferred.has(departure.line))
    .map((departure) => ({ departure, date: departureDate(departure) }))
    .filter((item): item is { departure: Departure; date: Date } => Boolean(item.date))
    .filter((item) => item.date.getTime() >= now.getTime() - 60_000)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (relevant.length === 0) {
    return { state: "insufficient", label: "Otillräcklig data", detail: "Ingen kommande matchande avgång hittades." };
  }

  const firstRunning = relevant.find((item) => !item.departure.isCancelled);
  if (!firstRunning) {
    return {
      state: "disruption",
      label: "Störning",
      detail: "Alla synliga matchande avgångar är inställda.",
      departure: relevant[0].departure
    };
  }

  const leadMs = (timingRule.walkingMinutes + timingRule.transferBufferMinutes) * 60_000;
  const leaveAt = new Date(firstRunning.date.getTime() - leadMs);
  const minutes = Math.ceil((leaveAt.getTime() - now.getTime()) / 60_000);
  const detail = `Linje ${firstRunning.departure.line} mot ${firstRunning.departure.destination}.`;

  if (minutes <= 0) {
    return { state: "leave-now", label: "Gå nu", detail, departure: firstRunning.departure, leaveAt: leaveAt.toISOString() };
  }

  return {
    state: "leave-in",
    label: `Gå om ${minutes} min`,
    detail,
    departure: firstRunning.departure,
    leaveAt: leaveAt.toISOString(),
    minutes
  };
}
