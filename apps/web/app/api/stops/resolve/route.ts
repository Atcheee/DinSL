import { NextRequest, NextResponse } from "next/server";
import { isSiteId } from "@/domain/models";
import { errorResponse, handleRouteError } from "@/server/http";
import { slClient } from "@/server/slClient";

export const runtime = "nodejs";

const MAX_IDS = 5;

export async function GET(request: NextRequest) {
  try {
    const raw = request.nextUrl.searchParams.get("ids")?.trim() ?? "";
    if (!raw) {
      return errorResponse("Parameter ids krävs", "BAD_REQUEST", 400);
    }

    const ids = [...new Set(raw.split(",").map((value) => value.trim()).filter(Boolean))];
    if (ids.length === 0 || ids.length > MAX_IDS) {
      return errorResponse(`Ange 1–${MAX_IDS} hållplats-id:n`, "BAD_REQUEST", 400);
    }
    if (!ids.every(isSiteId)) {
      return errorResponse("Alla hållplats-id:n måste vara numeriska", "INVALID_SITE_ID", 400);
    }

    const sites = await slClient.getSites();
    const byId = new Map(sites.map((site) => [site.id, site]));
    const resolved = ids
      .map((id) => byId.get(id))
      .filter((site): site is NonNullable<typeof site> => Boolean(site))
      .map((site) => ({
        id: site.id,
        name: site.name,
        gid: site.gid
      }));

    return NextResponse.json({ stops: resolved });
  } catch (error) {
    return handleRouteError(error);
  }
}
