"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function FavoriteStops() {
  const { favorites } = useFavorites();

  return (
    <Card className="h-full">
      <CardHeader className="p-5">
        <CardTitle className="text-lg">Favoriter</CardTitle>
        <CardDescription>Sparade hållplatser finns kvar i den här webbläsaren.</CardDescription>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {favorites.length === 0 ? (
          <p className="text-sm text-muted-foreground">Inga favoriter sparade ännu.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {favorites.map((favorite) => (
              <Button key={favorite.id} variant="secondary" size="sm" asChild>
                <Link href={`/stop/${favorite.id}`}>
                  <Star data-icon="inline-start" />
                  {favorite.name}
                </Link>
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
