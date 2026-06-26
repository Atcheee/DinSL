import { NextRequest, NextResponse } from "next/server";
import { handleRouteError } from "@/server/http";
import { slClient } from "@/server/slClient";

export const runtime = "nodejs";

const normalize = (value: string) => value.trim().toLocaleLowerCase("sv-SE");

export async function GET(request: NextRequest) {
  try {
    const q = normalize(request.nextUrl.searchParams.get("q") ?? "");
    if (q.length < 2) return NextResponse.json([]);

    const sites = await slClient.getSites();
    const matches = sites
      .map((site) => {
        const name = normalize(site.name);
        if (name === q) return { site, score: 0 };
        if (name.startsWith(q)) return { site, score: 1 };
        if (name.includes(q)) return { site, score: 2 };
        return undefined;
      })
      .filter((match): match is { site: (typeof sites)[number]; score: number } => Boolean(match))
      .sort((a, b) => a.score - b.score || a.site.name.localeCompare(b.site.name, "sv-SE"))
      .slice(0, 20)
      .map(({ site }) => site);

    return NextResponse.json(matches);
  } catch (error) {
    return handleRouteError(error);
  }
}
