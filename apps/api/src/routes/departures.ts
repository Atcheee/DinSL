import { Router } from "express";
import { slClient } from "../slClient.js";
import { asyncRoute } from "../utils/asyncRoute.js";

export const departuresRouter = Router();

departuresRouter.get(
  "/:siteId",
  asyncRoute(async (req, res) => {
    const rawSiteId = req.params.siteId;
    const siteId = Array.isArray(rawSiteId) ? undefined : rawSiteId;

    if (!siteId || !/^\d+$/.test(siteId)) {
      res.status(400).json({
        error: { message: "siteId must be numeric", code: "INVALID_SITE_ID" }
      });
      return;
    }

    const [site, departures] = await Promise.all([
      slClient.getSiteById(siteId),
      slClient.getDepartures(siteId)
    ]);

    res.json({ site: site ?? null, departures });
  })
);
