"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleCheck, Info, MapPin, Radio, Star } from "lucide-react";
import { apiClient } from "@/api/client";
import { useFavorites } from "@/hooks/useFavorites";
import { DepartureRow } from "@/components/DepartureRow";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { TransitBadge } from "@/components/TransitBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const modeLabel = (mode?: string) => {
  switch (mode) {
    case "METRO":
      return "Tunnelbana";
    case "BUS":
      return "Buss";
    case "TRAIN":
      return "Pendeltåg";
    case "TRAM":
      return "Spårvagn/lokalbana";
    case "SHIP":
      return "Båt";
    default:
      return mode ?? "Övrig trafik";
  }
};

const formatUpdated = (value?: string) => {
  if (!value) return "–";
  return new Intl.DateTimeFormat("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).format(new Date(value));
};

export function DepartureBoard({ siteId }: { siteId: string }) {
  const { favorites, isFavorite, toggleFavorite } = useFavorites();
  const query = useQuery({
    queryKey: ["departures", siteId],
    queryFn: () => apiClient.departures(siteId),
    refetchInterval: 20_000
  });

  const siteName =
    query.data?.site?.name ??
    favorites.find((favorite) => favorite.id === siteId)?.name ??
    `Hållplats ${siteId}`;
  const favorite = isFavorite(siteId);
  const departures = query.data?.departures.slice(0, 10) ?? [];

  const modeSummaries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const departure of query.data?.departures ?? []) {
      const mode = departure.mode ?? "OTHER";
      counts.set(mode, (counts.get(mode) ?? 0) + 1);
    }
    return Array.from(counts.entries());
  }, [query.data?.departures]);

  const lines = useMemo(() => {
    const unique = new Map<string, { line: string; mode?: string }>();
    for (const departure of query.data?.departures ?? []) {
      if (!departure.line) continue;
      unique.set(`${departure.mode ?? "OTHER"}:${departure.line}`, {
        line: departure.line,
        mode: departure.mode
      });
    }
    return Array.from(unique.values()).slice(0, 10);
  }, [query.data?.departures]);

  const mapUrl = useMemo(() => {
    const lat = query.data?.site?.lat;
    const lon = query.data?.site?.lon;
    if (typeof lat !== "number" || typeof lon !== "number") return null;
    const delta = 0.004;
    const bbox = [lon - delta, lat - delta, lon + delta, lat + delta]
      .map((value) => value.toFixed(6))
      .join("%2C");
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lon}`;
  }, [query.data?.site?.lat, query.data?.site?.lon]);

  const cancelledCount = departures.filter((departure) => departure.isCancelled).length;

  return (
    <section className="space-y-5" aria-live="polite">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-primary">
            <Radio className="size-4" aria-hidden="true" />
            Realtidsavgångar
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{siteName}</h1>
        </div>
        <Button
          variant={favorite ? "secondary" : "outline"}
          onClick={() => toggleFavorite({ id: siteId, name: siteName })}
          disabled={query.isLoading}
        >
          <Star data-icon="inline-start" className={favorite ? "fill-current" : ""} />
          {favorite ? "Sparad" : "Spara hållplats"}
        </Button>
      </header>

      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? <ErrorState message={query.error.message} /> : null}
      {query.data && departures.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Inga kommande avgångar hittades.
          </CardContent>
        </Card>
      ) : null}

      {query.data && departures.length > 0 ? (
        <>
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.75fr)]">
            <section aria-labelledby="departures-heading">
              <div className="mb-3 flex items-end justify-between gap-4">
                <div>
                  <h2 id="departures-heading" className="text-2xl font-bold tracking-tight">
                    Avgångar
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Uppdaterad {formatUpdated(query.data.fetchedAt)}
                    {query.data.isStale ? " · data kan vara fördröjd" : ""}
                  </p>
                </div>
                <div className="hidden grid-cols-[auto_3rem] gap-5 pr-1 text-xs font-semibold text-muted-foreground sm:grid">
                  <span>Avgångstid</span>
                  <span>Läge</span>
                </div>
              </div>
              <div className="space-y-2">
                {departures.map((departure) => (
                  <DepartureRow key={departure.id} departure={departure} />
                ))}
              </div>
            </section>

            <aside className="space-y-4" aria-label="Hållplatsinformation">
              {mapUrl ? (
                <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
                  <iframe
                    title={`Karta över ${siteName}`}
                    src={mapUrl}
                    className="h-72 w-full"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : null}

              <Card>
                <CardHeader className="p-5 pb-3">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <MapPin className="size-5 text-primary" aria-hidden="true" />
                    Hållplatsinformation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 px-5 pb-5">
                  <div className="flex items-center justify-between gap-3 rounded-md bg-muted/70 px-3 py-2">
                    <span className="font-medium">{siteName}</span>
                    <Badge variant="outline">{siteId}</Badge>
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-semibold">Linjer från den här platsen</p>
                    <div className="flex flex-wrap gap-2">
                      {lines.map(({ line, mode }) => (
                        <TransitBadge key={`${mode}:${line}`} mode={mode} line={line} compact />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>

          <section className="space-y-3" aria-labelledby="traffic-heading">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 id="traffic-heading" className="text-2xl font-bold tracking-tight">
                  Trafikläget just nu
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sammanfattning från avgångarna på hållplatsen.
                </p>
              </div>
              {cancelledCount > 0 ? (
                <Badge variant="destructive">{cancelledCount} inställda</Badge>
              ) : (
                <Badge className="gap-1.5 bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]">
                  <CircleCheck className="size-3.5" aria-hidden="true" />
                  Live
                </Badge>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {modeSummaries.map(([mode, count]) => (
                <Card key={mode} className="shadow-none">
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <span className="font-semibold">{modeLabel(mode)}</span>
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Info className="size-4" aria-hidden="true" />
                      {count} avgångar
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </section>
  );
}
