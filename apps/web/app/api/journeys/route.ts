import { NextRequest, NextResponse } from "next/server";
import {
  ALL_TRANSPORT_MODES,
  MAX_VIA_STOPS,
  isSiteId,
  type JourneySearchMode,
  type RoutePreference,
  type TransportMode
} from "@/domain/models";
import { errorResponse, handleRouteError } from "@/server/http";
import { journeyPlannerClient } from "@/server/journeyPlanner";
import { clientIpFromHeaders, rateLimit } from "@/server/rateLimit";
import { UpstreamError, slClient } from "@/server/slClient";

export const runtime = "nodejs";

const JOURNEYS_RATE_LIMIT = { limit: 30, windowMs: 60_000 } as const;

const parseModes = (raw: string | null): TransportMode[] => {
  if (!raw?.trim()) return [...ALL_TRANSPORT_MODES];
  const allowed = new Set(ALL_TRANSPORT_MODES);
  return raw
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter((value): value is TransportMode => allowed.has(value as TransportMode));
};

const parseRoutePreference = (raw: string | null): RoutePreference => {
  if (raw === "leastinterchange" || raw === "leastwalking" || raw === "leasttime") return raw;
  return "leasttime";
};

const parseViaIds = (raw: string | null): string[] | { error: string } => {
  if (!raw?.trim()) return [];
  const ids = [...new Set(raw.split(",").map((value) => value.trim()).filter(Boolean))];
  if (ids.length > MAX_VIA_STOPS) {
    return { error: `Högst ${MAX_VIA_STOPS} via-hållplatser tillåtna` };
  }
  if (!ids.every(isSiteId)) {
    return { error: "viaIds måste vara numeriska hållplats-id:n" };
  }
  return ids;
};

const isValidDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month! - 1 &&
    date.getUTCDate() === day
  );
};

const parseJourneyTime = (
  modeValue: string | null,
  dateValue: string | null,
  timeValue: string | null
):
  | { searchMode: JourneySearchMode; searchDate?: string; searchTime?: string }
  | { error: string } => {
  const searchMode = modeValue ?? "now";
  if (searchMode !== "now" && searchMode !== "departure" && searchMode !== "arrival") {
    return { error: "Ogiltigt tidsval" };
  }
  if (searchMode === "now") return { searchMode };

  const searchDate = dateValue?.trim() ?? "";
  const searchTime = timeValue?.trim() ?? "";
  if (!isValidDate(searchDate)) {
    return { error: "searchDate måste vara ett giltigt datum i formatet ÅÅÅÅ-MM-DD" };
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(searchTime)) {
    return { error: "searchTime måste vara en giltig tid i formatet TT:MM" };
  }
  return { searchMode, searchDate, searchTime };
};

// Always resolve from the sites catalog by site id. Client-provided GIDs may be
// corrupted (JSON number precision) from earlier saves — e.g. Fridhemsplan → Sankt Eriksplan.
const resolveGid = async (siteId: string) => {
  const site = await slClient.getSiteById(siteId);
  if (!site?.gid) throw new UpstreamError("Hållplatsen saknar reseplaner-id", 400, "MISSING_GID");
  return site.gid;
};

export async function GET(request: NextRequest) {
  try {
    const ip = clientIpFromHeaders(request.headers);
    const limited = rateLimit(`journeys:${ip}`, JOURNEYS_RATE_LIMIT);
    if (!limited.ok) {
      return NextResponse.json(
        { error: { message: "För många förfrågningar. Försök igen strax.", code: "RATE_LIMITED" } },
        {
          status: 429,
          headers: { "Retry-After": String(limited.retryAfterSec) }
        }
      );
    }

    const { searchParams } = request.nextUrl;
    const originId = searchParams.get("originId")?.trim();
    const destinationId = searchParams.get("destinationId")?.trim();
    if (!originId || !destinationId) {
      return errorResponse("originId och destinationId krävs", "BAD_REQUEST", 400);
    }
    if (!isSiteId(originId) || !isSiteId(destinationId)) {
      return errorResponse("originId och destinationId måste vara numeriska", "INVALID_SITE_ID", 400);
    }

    const parsedVia = parseViaIds(searchParams.get("viaIds"));
    if ("error" in parsedVia) {
      return errorResponse(parsedVia.error, "BAD_REQUEST", 400);
    }

    const viaIds = parsedVia.filter((id) => id !== originId && id !== destinationId);
    const parsedTime = parseJourneyTime(
      searchParams.get("searchMode"),
      searchParams.get("searchDate"),
      searchParams.get("searchTime")
    );
    if ("error" in parsedTime) {
      return errorResponse(parsedTime.error, "BAD_REQUEST", 400);
    }

    const [originGid, destinationGid, ...viaGids] = await Promise.all([
      resolveGid(originId),
      resolveGid(destinationId),
      ...viaIds.map(resolveGid)
    ]);

    const journeys = await journeyPlannerClient.plan({
      originGid,
      destinationGid,
      viaGids,
      preferredModes: parseModes(searchParams.get("modes")),
      routePreference: parseRoutePreference(searchParams.get("routePreference")),
      wheelchairAccessible: searchParams.get("wheelchair") === "1" || searchParams.get("wheelchair") === "true",
      maxChanges: searchParams.get("maxChanges") ? Number(searchParams.get("maxChanges")) : undefined,
      searchMode: parsedTime.searchMode,
      searchDate: parsedTime.searchDate,
      searchTime: parsedTime.searchTime
    });

    return NextResponse.json({
      journeys,
      fetchedAt: new Date().toISOString()
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
