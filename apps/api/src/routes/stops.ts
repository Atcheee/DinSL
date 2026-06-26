import { Router } from "express";
import { slClient } from "../slClient.js";
import { asyncRoute } from "../utils/asyncRoute.js";
import { distanceMeters } from "../utils/distance.js";

export const stopsRouter = Router();

const normalize = (value: string) => value.trim().toLocaleLowerCase("sv-SE");

const parseCoordinate = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

stopsRouter.get(
  "/search",
  asyncRoute(async (req, res) => {
    const q = typeof req.query.q === "string" ? normalize(req.query.q) : "";
    if (q.length < 2) {
      res.json([]);
      return;
    }

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

    res.json(matches);
  })
);

stopsRouter.get(
  "/nearby",
  asyncRoute(async (req, res) => {
    const lat = parseCoordinate(req.query.lat);
    const lon = parseCoordinate(req.query.lon);

    if (lat === undefined || lon === undefined || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      res.status(400).json({
        error: { message: "Valid lat and lon query parameters are required", code: "INVALID_COORDINATES" }
      });
      return;
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

    res.json(nearby);
  })
);
