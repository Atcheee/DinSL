"use client";

import { useEffect, useMemo, useState } from "react";
import type { Stop } from "@/api/types";

const STORAGE_KEY = "sl-departures:favorites";

type FavoriteStop = Pick<Stop, "id" | "name">;

const readFavorites = (): FavoriteStop[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FavoriteStop[];
    return Array.isArray(parsed) ? parsed.filter((item) => item.id && item.name) : [];
  } catch {
    return [];
  }
};

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteStop[]>([]);

  useEffect(() => {
    setFavorites(readFavorites());
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    }
  }, [favorites]);

  const favoriteIds = useMemo(() => new Set(favorites.map((favorite) => favorite.id)), [favorites]);

  const isFavorite = (id: string) => favoriteIds.has(id);

  const toggleFavorite = (stop: FavoriteStop) => {
    setFavorites((current) =>
      current.some((favorite) => favorite.id === stop.id)
        ? current.filter((favorite) => favorite.id !== stop.id)
        : [...current, stop].sort((a, b) => a.name.localeCompare(b.name, "sv-SE"))
    );
  };

  return { favorites, isFavorite, toggleFavorite };
}
