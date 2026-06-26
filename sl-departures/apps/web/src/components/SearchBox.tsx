"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Stop } from "@/api/types";
import { apiClient } from "@/api/client";
import { StopSearchResults } from "@/components/StopSearchResults";
import { Command, CommandInput } from "@/components/ui/command";

export function SearchBox() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const search = useQuery({
    queryKey: ["stops", "search", query],
    queryFn: () => apiClient.searchStops(query),
    enabled: query.trim().length >= 2
  });

  const selectStop = (stop: Stop) => {
    router.push(`/stop/${stop.id}`);
  };

  return (
    <Command shouldFilter={false} className="rounded-lg border">
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Sök exempelvis Slussen, Odenplan eller Älvsjö"
        aria-label="Sök hållplats"
      />
      <StopSearchResults stops={search.data ?? []} isLoading={search.isFetching} query={query} onSelect={selectStop} />
    </Command>
  );
}
