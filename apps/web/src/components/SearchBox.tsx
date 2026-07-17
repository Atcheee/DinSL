"use client";

import { useQuery } from "@tanstack/react-query";
import { Command as CommandPrimitive } from "cmdk";
import { LocateFixed, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { NearbyStop, Stop } from "@/api/types";
import { apiClient } from "@/api/client";
import { StopSearchResults } from "@/components/StopSearchResults";
import { Button } from "@/components/ui/button";
import { Command } from "@/components/ui/command";
import { useGeolocation } from "@/hooks/useGeolocation";
import { cn } from "@/lib/utils";

export function SearchBox({
  onSelect,
  placeholder = "Sök exempelvis Slussen, Odenplan eller Älvsjö",
  enableNearby = false
}: {
  onSelect?: (stop: Stop) => void;
  placeholder?: string;
  enableNearby?: boolean;
} = {}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [nearbyMode, setNearbyMode] = useState(false);
  const { coordinates, error: geoError, isLocating, requestLocation } = useGeolocation();

  const search = useQuery({
    queryKey: ["stops", "search", query],
    queryFn: () => apiClient.searchStops(query),
    enabled: !nearbyMode && query.trim().length >= 2
  });

  const nearby = useQuery({
    queryKey: ["stops", "nearby", coordinates?.lat, coordinates?.lon],
    queryFn: () => apiClient.nearbyStops(coordinates!.lat, coordinates!.lon),
    enabled: enableNearby && nearbyMode && Boolean(coordinates)
  });

  const selectStop = (stop: Stop) => {
    if (onSelect) onSelect(stop);
    else router.push(`/stop/${stop.id}`);
    setQuery("");
    setNearbyMode(false);
  };

  const findNearby = () => {
    setQuery("");
    setNearbyMode(true);
    requestLocation();
  };

  const onQueryChange = (value: string) => {
    setQuery(value);
    if (value.trim()) setNearbyMode(false);
  };

  const stops: Array<Stop | NearbyStop> = nearbyMode ? (nearby.data ?? []) : (search.data ?? []);
  const isLoading = nearbyMode ? isLocating || nearby.isFetching : search.isFetching;
  const errorMessage = nearbyMode ? geoError ?? (nearby.isError ? nearby.error.message : null) : null;

  return (
    <Command shouldFilter={false} className="rounded-lg border">
      <div className="flex items-center gap-1 border-b px-3" cmdk-input-wrapper="">
        <Search className="mr-1 size-4 shrink-0 opacity-50" aria-hidden="true" />
        <CommandPrimitive.Input
          value={query}
          onValueChange={onQueryChange}
          placeholder={placeholder}
          aria-label="Sök hållplats"
          className={cn(
            "flex h-11 min-w-0 flex-1 rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          )}
        />
        {enableNearby ? (
          <Button
            type="button"
            size="sm"
            variant={nearbyMode ? "default" : "ghost"}
            className="h-8 shrink-0 px-2"
            onClick={findNearby}
            disabled={isLocating}
            aria-pressed={nearbyMode}
            aria-label={isLocating ? "Hämtar plats" : "Visa närmaste hållplatser"}
          >
            <LocateFixed className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">{isLocating ? "Hämtar" : "Närmast"}</span>
          </Button>
        ) : null}
      </div>
      <StopSearchResults
        stops={stops}
        isLoading={isLoading}
        query={query}
        mode={nearbyMode ? "nearby" : "search"}
        error={errorMessage}
        onSelect={selectStop}
      />
    </Command>
  );
}
