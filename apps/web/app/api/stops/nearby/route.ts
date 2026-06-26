import { NextRequest, NextResponse } from "next/server";
import { distanceMeters } from "@/server/distance";
import { errorResponse, handleRouteError } from "@/server/http";
import { slClient } from "@/server/slClient";

export const runtime = "nodejs";

const parseCoordinate = (value: string | null) => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export async function GET(request: NextRequest) {
  try {
    const lat = parseCoordinate(request.nextUrl.searchParams.get("lat"));
    const lon = parseCoordinate(request.nextUrl.searchParams.get("lon"));

    if (lat === undefined || lon === undefined || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return errorResponse("Valid lat and lon query parameters are required", "INVALID_COORDINATES", 400);
    }

    const sites = await slClient.getSites();
    const nearby = sites
      .filter((site) => typeof site.lat === "number" && typeof site.lon === "number")
      .map((site) => ({
        ...site,
        distanceMeters: distanceMeters({ lat, lon }, { lat: site.lat!, lon: site.lon! })
      }))
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, 10);

    return NextResponse.json(nearby);
  } catch (error) {
    return handleRouteError(error);
  }
}
