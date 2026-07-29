"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { apiClient } from "@/api/client";
import type { Departure } from "@/api/types";
import { useFavorites } from "@/hooks/useFavorites";
import { DepartureRow } from "@/components/DepartureRow";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const modeLabel = (mode?: string) => {
  switch (mode) {
    case "METRO":
      return "Tunnelbana";
    case "BUS":
      return "Buss";
    case "TRAIN":
      return "Pendeltåg";
    case "TRAM":
      return "Spårvagn";
    case "SHIP":
      return "Båt";
    default:
      return mode ?? "Övrigt";
  }
};

export function DepartureBoard({ siteId }: { siteId: string }) {
  const { favorites, isFavorite, toggleFavorite } = useFavorites();
  const query = useQuery({
    queryKey: ["departures", siteId],
    queryFn: () => apiClient.departures(siteId),
    refetchInterval: 20_000
  });

  const groups = useMemo(() => {
    const grouped = new Map<string, Departure[]>();
    for (const departure of query.data?.departures ?? []) {
      const key = departure.mode ?? "OTHER";
      grouped.set(key, [...(grouped.get(key) ?? []), departure]);
    }
    return Array.from(grouped.entries());
  }, [query.data?.departures]);

  const siteName = query.data?.site?.name ?? favorites.find((favorite) => favorite.id === siteId)?.name ?? `Hållplats ${siteId}`;
  const favorite = isFavorite(siteId);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{siteName}</CardTitle>
              <Badge variant="outline">{siteId}</Badge>
            </div>
            <CardDescription>Uppdateras automatiskt ungefär var tjugonde sekund.</CardDescription>
          </div>
          <Button
            variant={favorite ? "secondary" : "outline"}
            onClick={() => toggleFavorite({ id: siteId, name: siteName })}
            disabled={query.isLoading}
          >
            <Star data-icon="inline-start" />
            {favorite ? "Sparad" : "Spara"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {query.isLoading ? <LoadingState /> : null}
        {query.isError ? <ErrorState message={query.error.message} /> : null}
        {query.data && query.data.departures.length === 0 ? (
          <p className="text-sm text-muted-foreground">Inga kommande avgångar hittades.</p>
        ) : null}
        {groups.length > 0 ? (
          <ScrollArea className="h-[70vh] pr-3">
            <div className="flex flex-col gap-5">
              {groups.map(([mode, departures], index) => (
                <section key={mode} className="flex flex-col gap-3">
                  {index > 0 ? <Separator /> : null}
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-sm font-semibold uppercase tracking-normal text-muted-foreground">
                      {modeLabel(mode)}
                    </h2>
                    <Badge variant="secondary">{departures.length}</Badge>
                  </div>
                  <div className="flex flex-col gap-2">
                    {departures.map((departure) => (
                      <DepartureRow key={departure.id} departure={departure} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </ScrollArea>
        ) : null}
      </CardContent>
    </Card>
  );
}
