import type { JourneyLeg, JourneyOption } from "@/api/types";

const pad = (value: number) => String(value).padStart(2, "0");

/** Format a Date as UTC iCal DATETIME (YYYYMMDDTHHMMSSZ). */
export const toIcalUtc = (date: Date) =>
  `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;

const escapeIcalText = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

const legLabel = (leg: JourneyLeg) => {
  const modeLine = leg.line ? `${leg.mode ?? "Linje"} ${leg.line}` : (leg.mode ?? "Gång");
  return `${modeLine}: ${leg.originName} → ${leg.destinationName}`;
};

export const journeyOriginName = (journey: JourneyOption) => journey.legs[0]?.originName ?? "Start";

export const journeyDestinationName = (journey: JourneyOption) =>
  journey.legs[journey.legs.length - 1]?.destinationName ?? "Mål";

export const journeyStartTime = (journey: JourneyOption): Date | null => {
  const raw = journey.legs[0]?.departureTime;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const journeyEndTime = (journey: JourneyOption): Date | null => {
  const raw = journey.legs[journey.legs.length - 1]?.arrivalTime;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const journeySummary = (journey: JourneyOption) =>
  `SL: ${journeyOriginName(journey)} → ${journeyDestinationName(journey)}`;

export const journeyDescription = (journey: JourneyOption) =>
  journey.legs.map(legLabel).join("\n");

export function buildIcsContent(journey: JourneyOption, now = new Date()): string | null {
  const start = journeyStartTime(journey);
  const end = journeyEndTime(journey);
  if (!start || !end) return null;

  const uid = `${journey.id}@sl-tider`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SL Tider//Journey//SV",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toIcalUtc(now)}`,
    `DTSTART:${toIcalUtc(start)}`,
    `DTEND:${toIcalUtc(end)}`,
    `SUMMARY:${escapeIcalText(journeySummary(journey))}`,
    `DESCRIPTION:${escapeIcalText(journeyDescription(journey))}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ];

  return `${lines.join("\r\n")}\r\n`;
}

export function downloadIcs(journey: JourneyOption): boolean {
  const content = buildIcsContent(journey);
  if (!content || typeof document === "undefined") return false;

  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const start = journeyStartTime(journey);
  const stamp = start ? toIcalUtc(start).slice(0, 8) : "resa";
  anchor.href = url;
  anchor.download = `sl-resa-${stamp}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return true;
}

/** Google Calendar expects dates=YYYYMMDDTHHMMSSZ/YYYYMMDDTHHMMSSZ */
export function buildGoogleCalendarUrl(journey: JourneyOption): string | null {
  const start = journeyStartTime(journey);
  const end = journeyEndTime(journey);
  if (!start || !end) return null;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: journeySummary(journey),
    dates: `${toIcalUtc(start)}/${toIcalUtc(end)}`,
    details: journeyDescription(journey)
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildGoogleMapsUrl(journey: JourneyOption): string | null {
  const origin = journeyOriginName(journey);
  const destination = journeyDestinationName(journey);
  if (!origin || !destination) return null;

  const params = new URLSearchParams({
    api: "1",
    origin,
    destination,
    travelmode: "transit"
  });

  const intermediate = journey.legs
    .slice(0, -1)
    .map((leg) => leg.destinationName)
    .filter((name, index, all) => name !== destination && all.indexOf(name) === index);

  if (intermediate.length) {
    params.set("waypoints", intermediate.join("|"));
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function buildAppleMapsUrl(journey: JourneyOption): string | null {
  const origin = journeyOriginName(journey);
  const destination = journeyDestinationName(journey);
  if (!origin || !destination) return null;

  const params = new URLSearchParams({
    saddr: origin,
    daddr: destination,
    dirflg: "r"
  });

  return `https://maps.apple.com/?${params.toString()}`;
}
