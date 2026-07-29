export type TransitKind = "walk" | "metro" | "train" | "tram" | "bus" | "ship" | "other";

export type TransitAppearance = {
  kind: TransitKind;
  label: string;
  backgroundColor: string;
  foregroundColor: string;
  borderColor: string;
};

type TransitPalette = Pick<
  TransitAppearance,
  "backgroundColor" | "foregroundColor" | "borderColor"
>;

const palette = (
  backgroundColor: string,
  foregroundColor: string,
  borderColor = backgroundColor
): TransitPalette => ({
  backgroundColor,
  foregroundColor,
  borderColor
});

const NEUTRAL = palette("hsl(var(--muted))", "hsl(var(--foreground))", "hsl(var(--border))");
const SL_BLUE = palette("#003E9A", "#FFFFFF");
const SL_RED = palette("#A4112C", "#FFFFFF");

const METRO_LINES: Record<string, TransitPalette> = {
  "10": palette("#009FE3", "#06131A"),
  "11": palette("#009FE3", "#06131A"),
  "13": palette("#E31B36", "#FFFFFF"),
  "14": palette("#E31B36", "#FFFFFF"),
  "17": palette("#00A651", "#06130A"),
  "18": palette("#00A651", "#06130A"),
  "19": palette("#00A651", "#06130A")
};

const LOCAL_RAIL_LINES: Record<string, TransitPalette> = {
  "7": palette("#B8BEC2", "#101417"),
  "12": palette("#7893A2", "#0A1216"),
  "21": palette("#C86E1A", "#171006"),
  "25": palette("#00A6A6", "#061515"),
  "26": palette("#00A6A6", "#061515"),
  "27": palette("#A957A1", "#FFFFFF"),
  "28": palette("#A957A1", "#FFFFFF"),
  "29": palette("#A957A1", "#FFFFFF"),
  "30": palette("#ED8B24", "#171006"),
  "31": palette("#ED8B24", "#171006")
};

const COMMUTER_RAIL = palette("#E84A92", "#180610");
const FERRY = palette("#007EA8", "#FFFFFF");

const normalizeMode = (mode?: string) => mode?.trim().toLowerCase() ?? "";

export const transitLineNumber = (line?: string) =>
  line?.trim().match(/\d+[A-Za-z]?/)?.[0]?.toUpperCase();

export const transitKind = (mode?: string): TransitKind => {
  const value = normalizeMode(mode);
  if (/gång|walk|foot/.test(value)) return "walk";
  if (/tunnelbana|metro|subway|underground/.test(value)) return "metro";
  if (/pendeltåg|commuter|(^|[^a-z])train([^a-z]|$)/.test(value)) return "train";
  if (/spårvagn|lokalbana|tram|light.?rail/.test(value)) return "tram";
  if (/buss|bus/.test(value)) return "bus";
  if (/båt|färja|ship|ferry|boat/.test(value)) return "ship";
  return "other";
};

const isBlueBusLine = (line?: string) => {
  if (!line) return false;
  if (["1", "2", "3", "4", "6"].includes(line)) return true;
  const numericLine = Number.parseInt(line, 10);
  return (
    (numericLine >= 172 && numericLine <= 179) ||
    (numericLine >= 471 && numericLine <= 474) ||
    (numericLine >= 670 && numericLine <= 677) ||
    (numericLine >= 873 && numericLine <= 875)
  );
};

const kindLabel = (kind: TransitKind, mode?: string) => {
  switch (kind) {
    case "walk":
      return "Gång";
    case "metro":
      return "Tunnelbana";
    case "train":
      return "Pendeltåg";
    case "tram":
      return "Spårvagn";
    case "bus":
      return "Buss";
    case "ship":
      return "Båt";
    default:
      return mode?.trim() || "Resa";
  }
};

export const getTransitAppearance = (mode?: string, line?: string): TransitAppearance => {
  const kind = transitKind(mode);
  const lineNumber = transitLineNumber(line);
  const label = lineNumber ? `${kindLabel(kind, mode)} ${lineNumber}` : kindLabel(kind, mode);

  let colors = NEUTRAL;
  if (kind === "metro") colors = (lineNumber && METRO_LINES[lineNumber]) || SL_BLUE;
  if (kind === "train") colors = COMMUTER_RAIL;
  if (kind === "tram") colors = (lineNumber && LOCAL_RAIL_LINES[lineNumber]) || LOCAL_RAIL_LINES["7"]!;
  if (kind === "bus") colors = isBlueBusLine(lineNumber) ? SL_BLUE : SL_RED;
  if (kind === "ship") colors = FERRY;

  return { kind, label, ...colors };
};
