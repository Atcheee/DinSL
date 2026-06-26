import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { config } from "./config.js";
import { departuresRouter } from "./routes/departures.js";
import { healthRouter } from "./routes/health.js";
import { stopsRouter } from "./routes/stops.js";
import { UpstreamError } from "./slClient.js";

const app = express();

app.use(
  cors({
    origin: config.corsOrigin
  })
);
app.use(express.json());

app.use("/api/health", healthRouter);
app.use("/api/stops", stopsRouter);
app.use("/api/departures", departuresRouter);

app.use((_req, res) => {
  res.status(404).json({ error: { message: "Route not found", code: "NOT_FOUND" } });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof UpstreamError) {
    res.status(error.status).json({ error: { message: error.message, code: error.code } });
    return;
  }

  console.error(error);
  res.status(500).json({ error: { message: "Internal server error", code: "INTERNAL_ERROR" } });
});

app.listen(config.port, () => {
  console.log(`SL Departures API listening on http://localhost:${config.port}`);
});
