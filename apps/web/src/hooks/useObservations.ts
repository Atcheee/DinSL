"use client";

import { useEffect, useState } from "react";
import { aggregateReliability } from "@/domain/reliability";
import type { DepartureObservation, ObservationType } from "@/domain/models";

const STORAGE_KEY = "sl-reliability:observations:v1";

export function useObservations(profileId?: string) {
  const [observations, setObservations] = useState<DepartureObservation[]>([]);

  useEffect(() => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as DepartureObservation[];
      setObservations(Array.isArray(parsed) ? parsed : []);
    } catch {
      setObservations([]);
    }
  }, []);

  const addObservation = (input: {
    type: ObservationType;
    siteId: string;
    departureId?: string;
    line?: string;
    delayMinutes?: number;
  }) => {
    if (!profileId) return;
    const next: DepartureObservation = {
      id: crypto.randomUUID(),
      profileId,
      siteId: input.siteId,
      departureId: input.departureId,
      line: input.line,
      type: input.type,
      delayMinutes: input.delayMinutes,
      observedAt: new Date().toISOString(),
      source: "manual"
    };
    setObservations((current) => {
      const updated = [next, ...current].slice(0, 500);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const profileObservations = observations.filter((item) => item.profileId === profileId);
  const summary = aggregateReliability(profileObservations);
  return { observations: profileObservations, summary, addObservation };
}
