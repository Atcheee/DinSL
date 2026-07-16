import { FavoriteStops } from "@/components/FavoriteStops";
import { NearbyStops } from "@/components/NearbyStops";
import { SearchBox } from "@/components/SearchBox";
import { Settings1 } from "@/components/settings-1";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <section className="container flex max-w-6xl flex-col gap-8 py-6 sm:py-10">
        <div className="flex flex-col gap-3 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge className="mb-3" variant="secondary">SL Commute Reliability</Badge>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Hinner du nästa?</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">Ett tydligt besked utifrån din station, gångtid och aktuella avgångar.</p>
          </div>
          <p className="text-sm font-medium text-muted-foreground">Stockholm · Realtidsläge</p>
        </div>

        <Settings1 />

        <Card className="mt-2">
          <CardHeader>
            <CardTitle>Sök hållplats</CardTitle>
            <CardDescription>Välj en station eller hållplats för realtidsavgångar.</CardDescription>
          </CardHeader>
          <CardContent>
            <SearchBox />
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <FavoriteStops />
          <NearbyStops />
        </div>
      </section>
    </main>
  );
}
