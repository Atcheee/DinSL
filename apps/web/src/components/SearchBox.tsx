"use client";

import { useQuery } from "@tanstack/react-query";
import { Command as CommandPrimitive } from "cmdk";
import { LocateFixed, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  enableNearby = false,
  storageKey,
  clearOnSelect = true
}: {
  onSelect?: (stop: Stop) => void;
  placeholder?: string;
  enableNearby?: boolean;
  storageKey?: string;
  clearOnSelect?: boolean;
} = {}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [nearbyMode, setNearbyMode] = useState(false);
  const [storageRestored, setStorageRestored] = useState(false);
  const { coordinates, error: geoError, isLocating, requestLocation } = useGeolocation();

  useEffect(() => {
    if (!storageKey) {
      setStorageRestored(true);
      return;
    }

    try {
      setQuery(window.sessionStorage.getItem(storageKey) ?? "");
    } catch {
      // Storage can be unavailable in private browsing; keep the in-memory value.
    } finally {
      setStorageRestored(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || !storageRestored) return;
    try {
      window.sessionStorage.setItem(storageKey, query);
    } catch {
      // Keep search usable when storage is unavailable.
    }
  }, [query, storageKey, storageRestored]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 120);

    return () => window.clearTimeout(timeout);
  }, [query]);

  const search = useQuery({
    queryKey: ["stops", "search", debouncedQuery],
    queryFn: () => apiClient.searchStops(debouncedQuery),
    enabled: !nearbyMode && debouncedQuery.length >= 2
  });

  const nearby = useQuery({
    queryKey: ["stops", "nearby", coordinates?.lat, coordinates?.lon],
    queryFn: () => apiClient.nearbyStops(coordinates!.lat, coordinates!.lon),
    enabled: enableNearby && nearbyMode && Boolean(coordinates)
  });

  const clearQuery = () => {
    setQuery("");
    setDebouncedQuery("");
    if (!storageKey) return;

    try {
      window.sessionStorage.removeItem(storageKey);
    } catch {
      // Keep selection working when storage is unavailable.
    }
  };

  const selectStop = (stop: Stop) => {
    if (clearOnSelect) clearQuery();
    setNearbyMode(false);
    if (onSelect) onSelect(stop);
    else router.push(`/stop/${stop.id}`);
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
  const isWaitingForSearch = query.trim().length >= 2 && query.trim() !== debouncedQuery;
  const isLoading = nearbyMode ? isLocating || nearby.isFetching : isWaitingForSearch || search.isFetching;
  const errorMessage = nearbyMode ? geoError ?? (nearby.isError ? nearby.error.message : null) : null;

  return (
    <Command shouldFilter={false} className="relative overflow-visible rounded-lg border bg-popover">
      <div className="flex items-center gap-1 px-3" cmdk-input-wrapper="">
        <Search className="mr-1 size-4 shrink-0 opacity-50" aria-hidden="true" />
        <CommandPrimitive.Input
          value={query}
          onValueChange={onQueryChange}
          placeholder={placeholder}
          aria-label="Sök hållplats"
          className={cn(
            "flex h-11 min-w-0 flex-1 rounded-md bg-transparent py-3 text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
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
