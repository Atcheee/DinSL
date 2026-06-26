import { FavoriteStops } from "@/components/FavoriteStops";
import { NearbyStops } from "@/components/NearbyStops";
import { SearchBox } from "@/components/SearchBox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <section className="container flex min-h-screen max-w-3xl flex-col gap-6 py-10 sm:justify-center sm:py-16">
        <div className="mx-auto flex max-w-2xl flex-col gap-3 text-center">
          <h1 className="text-4xl font-semibold tracking-normal sm:text-5xl">SL avgångar</h1>
          <p className="text-base leading-7 text-muted-foreground sm:text-lg">
            Sök hållplatser och stationer i Stockholm och se kommande avgångar utan extra steg.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sök hållplats</CardTitle>
            <CardDescription>Välj en station eller hållplats för realtidsavgångar.</CardDescription>
          </CardHeader>
          <CardContent>
            <SearchBox />
          </CardContent>
        </Card>

        <FavoriteStops />
        <NearbyStops />
      </section>
    </main>
  );
}
