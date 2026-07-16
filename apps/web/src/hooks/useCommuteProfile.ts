"use client";

import { useEffect, useState } from "react";
import type { CommuteProfile } from "@/domain/models";

const STORAGE_KEY = "sl-reliability:commute-profile:v1";

export function useCommuteProfile() {
  const [profile, setProfileState] = useState<CommuteProfile | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      setProfileState(raw ? (JSON.parse(raw) as CommuteProfile) : null);
    } catch {
      setProfileState(null);
    } finally {
      setHydrated(true);
    }
  }, []);

  const setProfile = (next: CommuteProfile | null) => {
    setProfileState(next);
    if (next) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else window.localStorage.removeItem(STORAGE_KEY);
  };

  return { profile, setProfile, hydrated };
}
