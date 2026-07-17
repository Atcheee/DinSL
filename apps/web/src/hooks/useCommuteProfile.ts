"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/api/client";
import {
  ALL_TRANSPORT_MODES,
  MAX_VIA_STOPS,
  type CommuteProfile,
  type ProfileStop,
  type RoutePreference,
  type TransportMode
} from "@/domain/models";
import {
  decodeShareProfile,
  readShareParam,
  rebindShareStopsToCatalog,
  shareableToCommuteProfile,
  stripShareParamFromUrl,
  type ShareableProfile
} from "@/lib/shareProfile";

const STORAGE_KEY = "sl-reliability:commute-profile:v2";
const LEGACY_STORAGE_KEY = "sl-reliability:commute-profile:v1";

type LegacyProfile = {
  id: string;
  name: string;
  originStop: ProfileStop;
  destinationLabel: string;
  preferredLines: string[];
  avoidedLines?: string[];
  timingRule: CommuteProfile["timingRule"];
  createdAt: string;
  updatedAt: string;
  destinationStop?: ProfileStop;
  viaStops?: ProfileStop[];
  destinations?: ProfileStop[];
  preferredModes?: TransportMode[];
  routePreference?: RoutePreference;
  wheelchairAccessible?: boolean;
};

const normalizeProfile = (raw: LegacyProfile): CommuteProfile => {
  const legacyDestinations =
    raw.destinations?.length
      ? raw.destinations
      : raw.destinationLabel
        ? [{ id: `label:${raw.destinationLabel}`, name: raw.destinationLabel }]
        : [];

  const destinationStop =
    raw.destinationStop ??
    legacyDestinations[0] ??
    (raw.destinationLabel
      ? { id: `label:${raw.destinationLabel}`, name: raw.destinationLabel }
      : { id: "label:okänd", name: "Okänd destination" });

  // Older profiles used destinations[] as alternate end points. Prefer an
  // explicit viaStops list; otherwise ignore extras (they were not vias).
  const viaStops = (raw.viaStops ?? []).slice(0, MAX_VIA_STOPS);

  return {
    id: raw.id,
    name: raw.name,
    originStop: raw.originStop,
    destinationStop,
    viaStops,
    destinations: [destinationStop, ...viaStops],
    destinationLabel: destinationStop.name,
    preferredLines: raw.preferredLines ?? [],
    avoidedLines: raw.avoidedLines ?? [],
    preferredModes: raw.preferredModes?.length ? raw.preferredModes : [...ALL_TRANSPORT_MODES],
    routePreference: raw.routePreference ?? "leasttime",
    wheelchairAccessible: Boolean(raw.wheelchairAccessible),
    timingRule: raw.timingRule,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt
  };
};

const readStoredProfile = (): CommuteProfile | null => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
    return raw ? normalizeProfile(JSON.parse(raw) as LegacyProfile) : null;
  } catch {
    return null;
  }
};

const persistProfile = (next: CommuteProfile | null) => {
  try {
    if (next) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  } catch {
    // Private mode / quota — keep in-memory profile working without crashing submit.
  }
};

const lookupCatalogStops = async (ids: string[]) => {
  const { stops } = await apiClient.resolveStops(ids);
  return stops;
};

export function useCommuteProfile() {
  const [profile, setProfileState] = useState<CommuteProfile | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [importedFromShare, setImportedFromShare] = useState(false);
  const [pendingShare, setPendingShare] = useState<ShareableProfile | null>(null);
  const [shareImportError, setShareImportError] = useState<string | null>(null);

  const applyResolvedShare = useCallback((share: ShareableProfile, current: CommuteProfile | null) => {
    const next = shareableToCommuteProfile(share, current);
    persistProfile(next);
    setProfileState(next);
    setImportedFromShare(true);
    setPendingShare(null);
    setShareImportError(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      const stored = readStoredProfile();
      const shareParam = readShareParam();
      const shared = shareParam ? decodeShareProfile(shareParam) : null;

      if (!shared) {
        if (!cancelled) {
          setProfileState(stored);
          setHydrated(true);
        }
        return;
      }

      stripShareParamFromUrl();

      try {
        const resolved = await rebindShareStopsToCatalog(shared, lookupCatalogStops);
        if (cancelled) return;

        if (!resolved) {
          setShareImportError("Delningslänken innehåller ogiltiga hållplatser.");
          setProfileState(stored);
        } else if (stored) {
          setPendingShare(resolved);
          setProfileState(stored);
        } else {
          applyResolvedShare(resolved, null);
        }
      } catch {
        if (!cancelled) {
          setShareImportError("Kunde inte verifiera delningslänken.");
          setProfileState(stored);
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [applyResolvedShare]);

  const setProfile = (next: CommuteProfile | null) => {
    setProfileState(next);
    persistProfile(next);
  };

  const acceptPendingShare = () => {
    if (!pendingShare) return;
    applyResolvedShare(pendingShare, profile);
  };

  const dismissPendingShare = () => {
    setPendingShare(null);
  };

  return {
    profile,
    setProfile,
    hydrated,
    importedFromShare,
    pendingShare,
    shareImportError,
    acceptPendingShare,
    dismissPendingShare,
    clearShareImportError: () => setShareImportError(null)
  };
}
