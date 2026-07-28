# DinSL

Mobile-first Stockholm commuter dashboard. Dashboard saves one anonymous commute profile, calculates a clearly labeled leave-now estimate, captures reliability observations, and can share trip settings via QR code.

## Architecture

- `apps/web`: Next.js App Router UI, same-origin SL proxy, commute timing domain, and local profile storage.
- `apps/api`: existing Express API for separately hosted deployments.
- SL Transport: sites, lines, and current departures. This API is not treated as a journey planner.
- `JourneyPlanner` interface: isolated seam for future SL Journey-planner v2 integration.

Static site data caches for hours. Departures cache for 20 seconds with request coalescing, stale-while-revalidate fallback, upstream timeout handling, and automatic client refresh.

## Privacy and retention

- Commute profile and manual observations stay in browser `localStorage`.
- Observation records contain stop, line, event type, and timestamp; never precise location.
- Nearby-stop lookup uses current coordinates in memory only. No location history is stored.
- Local observation history is capped at 500 entries.
- Shared trip links encode profile settings in the URL; scanning imports them into that browser's local storage.

## Environment variables

Copy `.env.example` to ignored `.env.local`.

```bash
SHADCNDESIGN_LICENSE_KEY=
NEXT_PUBLIC_API_BASE_URL=
```

`SHADCNDESIGN_LICENSE_KEY` authenticates licensed Pro Blocks during development only. Never use a `NEXT_PUBLIC_` prefix.

`NEXT_PUBLIC_API_BASE_URL` is optional. Leave blank to use Next.js same-origin API routes.

## Local development

Requires Node.js 20.9+ and pnpm 11.

```bash
pnpm install
pnpm dev
```

- Web: `http://localhost:3000`
- Express API: `http://localhost:8000`

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Tests cover leave timing, midnight rollover, Stockholm DST offsets, stale data, cancellations, reliability aggregation, cache coalescing/SWR, and trip share encoding. Playwright covers saving a commute profile and sharing it via QR link on mobile and desktop Chromium.

## Deployment

Deploy `apps/web` as Vercel project root, or deploy from repository root using existing Vercel monorepo settings. `SHADCNDESIGN_LICENSE_KEY` is needed only if a remote build invokes the licensed registry CLI; committed component source does not require it at runtime.

The Express app can be deployed separately. Set `NEXT_PUBLIC_API_BASE_URL` to its origin and `CORS_ORIGIN` to the web URL.

## API boundaries

- SL Transport endpoints: `https://transport.integration.sl.se/v1/sites?expand=true` and `/sites/{siteId}/departures`.
- Full A-to-B routing belongs behind `JourneyPlanner` and should use official SL Journey-planner v2, not departure data.
