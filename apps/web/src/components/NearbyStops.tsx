"use client";

import Link from "next/link";
import { LocateFixed, MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { useGeolocation } from "@/hooks/useGeolocation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";

export function NearbyStops() {
  const { coordinates, error, isLocating, requestLocation } = useGeolocation();
  const nearby = useQuery({
    queryKey: ["stops", "nearby", coordinates?.lat, coordinates?.lon],
    queryFn: () => apiClient.nearbyStops(coordinates!.lat, coordinates!.lon),
    enabled: Boolean(coordinates)
  });

  return (
    <Card className="h-full">
      <CardHeader className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <CardTitle className="text-lg">Nära dig</CardTitle>
            <CardDescription>Plats används bara när du väljer att söka nära dig.</CardDescription>
          </div>
          <Button size="sm" onClick={requestLocation} disabled={isLocating}>
            <LocateFixed data-icon="inline-start" />
            {isLocating ? "Hämtar plats" : "Hitta nära"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {error ? <ErrorState message={error} /> : null}
        {nearby.isError ? <ErrorState message={nearby.error.message} /> : null}
        {nearby.isFetching ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : null}
        {nearby.data ? (
          <div className="flex flex-col gap-2">
            {nearby.data.map((stop) => (
              <Button key={stop.id} variant="outline" className="h-auto justify-between py-3" asChild>
                <Link href={`/stop/${stop.id}`}>
                  <span className="flex min-w-0 items-center gap-2">
                    <MapPin data-icon="inline-start" />
                    <span className="truncate">{stop.name}</span>
                  </span>
                  <span className="text-muted-foreground">{Math.round(stop.distanceMeters)} m</span>
                </Link>
              </Button>
            ))}
          </div>
        ) : null}
        {!coordinates && !error ? <p className="text-sm text-muted-foreground">Du kan fortfarande söka utan att dela plats.</p> : null}
      </CardContent>
    </Card>
  );
}
