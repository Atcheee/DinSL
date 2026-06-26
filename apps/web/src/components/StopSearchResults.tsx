"use client";

import { MapPin } from "lucide-react";
import type { Stop } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";

type StopSearchResultsProps = {
  stops: Stop[];
  isLoading: boolean;
  query: string;
  onSelect: (stop: Stop) => void;
};

export function StopSearchResults({ stops, isLoading, query, onSelect }: StopSearchResultsProps) {
  if (query.trim().length < 2) {
    return (
      <CommandList>
        <CommandEmpty>Skriv minst två tecken.</CommandEmpty>
      </CommandList>
    );
  }

  if (isLoading) {
    return (
      <CommandList>
        <CommandEmpty>Söker...</CommandEmpty>
      </CommandList>
    );
  }

  return (
    <CommandList>
      {stops.length === 0 ? <CommandEmpty>Inga hållplatser hittades.</CommandEmpty> : null}
      <CommandGroup heading="Hållplatser">
        {stops.map((stop) => (
          <CommandItem key={stop.id} value={`${stop.name} ${stop.id}`} onSelect={() => onSelect(stop)}>
            <div className="flex w-full items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="truncate font-medium">{stop.name}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {stop.modes?.slice(0, 2).map((mode) => (
                  <Badge key={mode} variant="secondary">
                    {mode}
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
