"use client";

import { MapPin } from "lucide-react";
import type { NearbyStop, Stop } from "@/api/types";
import { TRANSPORT_MODE_LABELS, type TransportMode } from "@/domain/models";
import { Badge } from "@/components/ui/badge";
import { CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";

type StopSearchResultsProps = {
  stops: Array<Stop | NearbyStop>;
  isLoading: boolean;
  query: string;
  onSelect: (stop: Stop) => void;
  mode?: "search" | "nearby";
  error?: string | null;
};

const hasDistance = (stop: Stop | NearbyStop): stop is NearbyStop =>
  "distanceMeters" in stop && typeof stop.distanceMeters === "number";

const modeBadgeLabel = (modeName: string) =>
  TRANSPORT_MODE_LABELS[modeName as TransportMode] ?? modeName;

const resultsClassName =
  "absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-lg border bg-popover p-1 shadow-xl";

export function StopSearchResults({
  stops,
  isLoading,
  query,
  onSelect,
  mode = "search",
  error = null
}: StopSearchResultsProps) {
  if (error) {
    return (
      <CommandList className={resultsClassName}>
        <CommandEmpty>{error}</CommandEmpty>
      </CommandList>
    );
  }

  if (mode === "search" && query.trim().length < 2) {
    return null;
  }

  if (isLoading) {
    return (
      <CommandList className={resultsClassName}>
        <CommandEmpty>{mode === "nearby" ? "Hämtar närmaste hållplatser..." : "Söker..."}</CommandEmpty>
      </CommandList>
    );
  }

  if (mode === "nearby" && stops.length === 0) {
    return (
      <CommandList className={resultsClassName}>
        <CommandEmpty>Inga hållplatser nära dig hittades.</CommandEmpty>
      </CommandList>
    );
  }

  return (
    <CommandList className={resultsClassName}>
      {stops.length === 0 ? <CommandEmpty>Inga hållplatser hittades.</CommandEmpty> : null}
      <CommandGroup heading={mode === "nearby" ? "Närmast dig" : "Hållplatser"}>
        {stops.map((stop) => (
          <CommandItem key={stop.id} value={`${stop.name} ${stop.id}`} onSelect={() => onSelect(stop)}>
            <div className="flex w-full items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="truncate font-medium">{stop.name}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {hasDistance(stop) ? (
                  <Badge variant="secondary">{Math.round(stop.distanceMeters)} m</Badge>
                ) : null}
                {stop.modes?.slice(0, 2).map((modeName) => (
                  <Badge key={modeName} variant="secondary" className="hidden sm:inline-flex">
                    {modeBadgeLabel(modeName)}
                  </Badge>
                ))}
                <Badge variant="outline">{stop.id}</Badge>
              </div>
            </div>
          </CommandItem>
        ))}
      </CommandGroup>
    </CommandList>
  );
}
