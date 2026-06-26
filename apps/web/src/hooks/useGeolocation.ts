"use client";

import { useState } from "react";

type Coordinates = {
  lat: number;
  lon: number;
};

export function useGeolocation() {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const requestLocation = () => {
    setError(null);

    if (!navigator.geolocation) {
      setError("Din webbläsare stödjer inte platsdelning.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
        setIsLocating(false);
      },
      () => {
        setError("Kunde inte hämta din plats.");
        setIsLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  };

  return { coordinates, error, isLocating, requestLocation };
}
