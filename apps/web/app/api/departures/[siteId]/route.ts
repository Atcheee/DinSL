import { NextResponse } from "next/server";
import { errorResponse, handleRouteError } from "@/server/http";
import { slClient } from "@/server/slClient";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ siteId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { siteId } = await context.params;

    if (!/^\d+$/.test(siteId)) {
      return errorResponse("siteId must be numeric", "INVALID_SITE_ID", 400);
    }

    const [site, departures] = await Promise.all([
      slClient.getSiteById(siteId),
      slClient.getDepartures(siteId)
    ]);

    return NextResponse.json({ site: site ?? null, departures });
  } catch (error) {
    return handleRouteError(error);
  }
}
