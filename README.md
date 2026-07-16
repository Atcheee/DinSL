# SL Commute Reliability

Mobile-first Stockholm commuter dashboard and fullscreen public departure display. Dashboard saves one anonymous commute profile, calculates a clearly labeled leave-now estimate, and captures reliability observations. Public screens use server-only, long-lived display tokens.

## Architecture

- `apps/web`: Next.js App Router UI, same-origin SL proxy, commute timing domain, local profile storage, and public display route.
- `apps/api`: existing Express API for separately hosted deployments.
- SL Transport: sites, lines, and current departures. This API is not treated as a journey planner.
- `JourneyPlanner` interface: isolated seam for future SL Journey-planner v2 integration.
- `DisplayRepository`: server interface currently backed by environment configuration; ready for a PostgreSQL implementation when managed displays need durable remote administration.

Static site data caches for hours. Departures cache for 20 seconds with request coalescing, stale-while-revalidate fallback, upstream timeout handling, and automatic client refresh.

## Privacy and retention

- Commute profile and manual observations stay in browser `localStorage`.
- Observation records contain stop, line, event type, and timestamp; never precise location.
- Nearby-stop lookup uses current coordinates in memory only. No location history is stored.
- Local observation history is capped at 500 entries.
- Managed display tokens remain server-side. Public display pages contain no account controls.

## Environment variables

Copy `.env.example` to ignored `.env.local`.

```bash
SHADCNDESIGN_LICENSE_KEY=
NEXT_PUBLIC_API_BASE_URL=
DISPLAY_CONFIGS_JSON=
```

`SHADCNDESIGN_LICENSE_KEY` authenticates licensed Pro Blocks during development only. Never use a `NEXT_PUBLIC_` prefix.

`NEXT_PUBLIC_API_BASE_URL` is optional. Leave blank to use Next.js same-origin API routes.

`DISPLAY_CONFIGS_JSON` is a server-only JSON array:

```json
[
  {
    "id": "cafe-screen-1",
    "token": "replace-with-a-long-random-token",
    "siteId": "9192",
    "venueName": "Café Central",
    "preferredLines": ["13", "14"],
    "refreshSeconds": 20,
    "expiresAt": "2027-12-31T23:59:59Z",
    "revokedAt": null
  }
]
```

Rotate or remove `token`, set `revokedAt`, or set `active` to `false` to revoke access. For multiple remotely managed screens, replace the environment repository with PostgreSQL while preserving the interface.

## Local development

Requires Node.js 20.9+ and pnpm 11.

```bash
pnpm install
pnpm dev
```

- Web: `http://localhost:3000`
- Express API: `http://localhost:8000`
- Display: `http://localhost:3000/display/<configured-token>`

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Tests cover leave timing, midnight rollover, Stockholm DST offsets, stale data, cancellations, reliability aggregation, cache coalescing/SWR, and token expiry/revocation. Playwright covers saving a commute profile and opening a tokenized display on mobile and desktop Chromium.

## Deployment

Deploy `apps/web` as Vercel project root, or deploy from repository root using existing Vercel monorepo settings. Add `DISPLAY_CONFIGS_JSON` as a sensitive server environment variable. `SHADCNDESIGN_LICENSE_KEY` is needed only if a remote build invokes the licensed registry CLI; committed component source does not require it at runtime.

The Express app can be deployed separately. Set `NEXT_PUBLIC_API_BASE_URL` to its origin and `CORS_ORIGIN` to the web URL.

## API boundaries

- SL Transport endpoints: `https://transport.integration.sl.se/v1/sites?expand=true` and `/sites/{siteId}/departures`.
- Full A-to-B routing belongs behind `JourneyPlanner` and should use official SL Journey-planner v2, not departure data.
