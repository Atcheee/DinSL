export const formatDepartureTime = (displayTime?: string, expectedTime?: string) => {
  if (displayTime) return displayTime;
  if (!expectedTime) return "";

  const expected = new Date(expectedTime);
  if (Number.isNaN(expected.getTime())) return "";

  const diffMinutes = Math.round((expected.getTime() - Date.now()) / 60_000);
  if (diffMinutes <= 0) return "Nu";
  if (diffMinutes <= 10) return `${diffMinutes} min`;

  return new Intl.DateTimeFormat("sv-SE", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(expected);
};

export const formatClockTime = (value?: string) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Intl.DateTimeFormat("sv-SE", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
};

export const formatJourneyDuration = (seconds: number) => {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
};

export const formatJourneyClock = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
};
