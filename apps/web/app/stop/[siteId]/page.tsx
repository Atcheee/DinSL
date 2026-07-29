import Link from "next/link";
import { Activity, ArrowLeft, Search } from "lucide-react";
import { DepartureBoard } from "@/components/DepartureBoard";
import { ModeToggle } from "@/components/mode-toggle";
import { SearchBox } from "@/components/SearchBox";
import { Button } from "@/components/ui/button";

type StopPageProps = {
  params: Promise<{ siteId: string }>;
};

export default async function StopPage({ params }: StopPageProps) {
  const { siteId } = await params;

  return (
    <main className="min-h-screen bg-[#f4f5f6] dark:bg-background">
      <div className="h-2 bg-primary" />
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
        <div className="container flex h-16 max-w-[1240px] items-center justify-between gap-4">
          <Link href="/" className="font-bold tracking-tight" aria-label="DinSL startsida">
            <span className="text-xl">DinSL</span>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex" aria-label="Huvudnavigation">
            <Button variant="ghost" asChild>
              <Link href="/#planera">Planera resa</Link>
            </Button>
            <Button asChild>
              <Link href="/#hallplatser" aria-current="page">
                Avgångar
              </Link>
            </Button>
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 text-sm font-medium text-muted-foreground md:flex">
              <Activity className="size-4 text-[hsl(var(--success))]" aria-hidden="true" />
              Realtidsläge
            </span>
            <ModeToggle />
          </div>
        </div>
      </header>

      <section className="container max-w-[1240px] py-5 sm:py-7">
        <div className="mb-5 rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
          <div className="mx-auto max-w-3xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-primary">Byt hållplats</p>
                <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Sök avgångar</h2>
              </div>
              <Search className="size-5 text-primary" aria-hidden="true" />
            </div>
            <SearchBox
              placeholder="Sök hållplats eller station"
              enableNearby
              storageKey="dinsl:departures-search:v1"
            />
          </div>
        </div>

        <Button variant="ghost" size="sm" asChild className="mb-3 -ml-3">
          <Link href="/#hallplatser">
            <ArrowLeft data-icon="inline-start" />
            Alla hållplatser
          </Link>
        </Button>

        <DepartureBoard siteId={siteId} />
      </section>
    </main>
  );
}
