# SL Departures

A fast, mobile-friendly full-stack web app for searching Stockholm SL stops and viewing real-time departures.

## APIs

The backend calls SL/Trafiklab public integration APIs directly:

- Stops/sites: `https://transport.integration.sl.se/v1/sites?expand=true`
- Departures: `https://transport.integration.sl.se/v1/sites/{site_id}/departures`
- Lines: `https://transport.integration.sl.se/v1/lines?transport_authority_id=1`

The SL Transport API endpoints used here do not require an API key.

## Local Development

Install dependencies:

```bash
pnpm install
```

Run the web app and API together:

```bash
pnpm dev
```

Default local URLs:

- Web: `http://localhost:3000`
- API: `http://localhost:8000`
- API health: `http://localhost:8000/api/health`

Build both apps:

```bash
pnpm build
```

## Environment Variables

Backend (`apps/api/.env.example`):

```bash
PORT=8000
CORS_ORIGIN=http://localhost:3000
```

Frontend (`apps/web/.env.example`):

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## Caching

The API keeps lightweight in-memory caches to avoid unnecessary upstream traffic:

- Sites: 6 hours
- Lines: 6 hours
- Departures: 20 seconds per site ID

This is intentionally simple for local development and small deployments. For production, use a shared cache if you run multiple API instances.

## Deployment Notes

For Vercel, deploy the Next.js app in `apps/web`. It includes same-origin API route handlers under `/api/*`, so the browser does not call SL/Trafiklab directly and no `NEXT_PUBLIC_API_BASE_URL` is required in production.

If you deploy the Express API separately, set `NEXT_PUBLIC_API_BASE_URL` to that API origin and set `CORS_ORIGIN` to the web app origin.
