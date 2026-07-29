"use client";

import Link from "next/link";
import { Activity, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { ModeToggle } from "@/components/mode-toggle";
import { Settings1 } from "@/components/settings-1";

type HomeView = "planner" | "departures";
const HOME_VIEW_STORAGE_KEY = "dinsl:home-view:v1";

export default function HomePage() {
  const [activeView, setActiveView] = useState<HomeView>("planner");

  useEffect(() => {
    const syncViewFromHash = () => {
      const hashView: HomeView | null =
        window.location.hash === "#hallplatser"
          ? "departures"
          : window.location.hash === "#planera"
            ? "planner"
            : null;
      let nextView: HomeView | null = hashView;

      if (!nextView) {
        try {
          nextView = window.sessionStorage.getItem(HOME_VIEW_STORAGE_KEY) === "departures" ? "departures" : "planner";
        } catch {
          nextView = "planner";
        }
      }

      setActiveView(nextView);
      try {
        window.sessionStorage.setItem(HOME_VIEW_STORAGE_KEY, nextView);
      } catch {
        // Keep tab navigation working when storage is unavailable.
      }
    };

    syncViewFromHash();
    window.addEventListener("hashchange", syncViewFromHash);
    return () => window.removeEventListener("hashchange", syncViewFromHash);
  }, []);

  const selectView = (view: HomeView) => {
    setActiveView(view);
    try {
      window.sessionStorage.setItem(HOME_VIEW_STORAGE_KEY, view);
    } catch {
      // Keep tab navigation working when storage is unavailable.
    }
    window.history.replaceState(null, "", view === "planner" ? "#planera" : "#hallplatser");
  };

  return (
    <main className="min-h-screen bg-[#f4f5f6] dark:bg-background">
      <div className="h-2 bg-primary" />
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
        <div className="container flex h-16 max-w-[1240px] items-center justify-between gap-4">
          <Link href="/" className="font-bold tracking-tight" aria-label="DinSL startsida">
            <span className="text-xl">DinSL</span>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex" aria-label="Huvudnavigation" role="tablist">
            <button
              id="planner-tab"
              type="button"
              role="tab"
              aria-selected={activeView === "planner"}
              aria-controls="planera"
              onClick={() => selectView("planner")}
              className={
                activeView === "planner"
                  ? "rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                  : "rounded-md px-4 py-2 text-sm font-semibold hover:bg-muted"
              }
            >
              Planera resa
            </button>
            <button
              id="departures-tab"
              type="button"
              role="tab"
              aria-selected={activeView === "departures"}
              aria-controls="hallplatser"
              onClick={() => selectView("departures")}
              className={
                activeView === "departures"
                  ? "rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                  : "rounded-md px-4 py-2 text-sm font-semibold hover:bg-muted"
              }
            >
              Avgångar
            </button>
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
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-semibold text-primary">
              {activeView === "planner" ? "Stockholmsresan, i realtid" : "Avgångar nära dig"}
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {activeView === "planner" ? "Hinner du nästa?" : "När går nästa?"}
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground sm:text-base">
              {activeView === "planner"
                ? "Planera resan och få ett tydligt lämna-nu-besked på samma skärm."
                : "Sök station, öppna favoriter eller hitta hållplatser nära dig."}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <MapPin className="size-4 text-primary" aria-hidden="true" />
            Stockholm
          </div>
        </div>

        <Settings1 view={activeView} />
      </section>
    </main>
  );
}
