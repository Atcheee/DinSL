"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock3, Radio, RefreshCw, WifiOff } from "lucide-react";
import QRCode from "qrcode";
import { apiClient } from "@/api/client";
import type { Display } from "@/domain/models";
import { Badge } from "@/components/ui/badge";

const clock = new Intl.DateTimeFormat("sv-SE", { hour: "2-digit", minute: "2-digit" });

const departureTime = (value?: string) => {
  if (!value) return "–";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : clock.format(date);
};

export function PublicDisplay({ display }: { display: Display }) {
  const [now, setNow] = useState(() => new Date());
  const [qr, setQr] = useState<string>();
  const query = useQuery({
    queryKey: ["public-display", display.id, display.siteId],
    queryFn: () => apiClient.departures(display.siteId),
    refetchInterval: display.refreshSeconds * 1000,
    retry: 3
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 10_000);
    void QRCode.toDataURL(window.location.href, { width: 220, margin: 1, color: { dark: "#07121f", light: "#ffffff" } }).then(setQr);
    return () => window.clearInterval(timer);
  }, []);

  const departures = useMemo(() => {
    const preferred = new Set(display.preferredLines);
    return (query.data?.departures ?? [])
      .filter((item) => preferred.size === 0 || preferred.has(item.line))
      .slice(0, 8);
  }, [display.preferredLines, query.data?.departures]);

  const stale = Boolean(
    query.data?.isStale ||
      (query.data?.fetchedAt && now.getTime() - new Date(query.data.fetchedAt).getTime() > 60_000)
  );

  return (
    <main className="display-safe-shift min-h-screen bg-[#07121f] p-[clamp(1rem,3vw,3rem)] text-white">
      <div className="mx-auto flex min-h-[calc(100vh-6vw)] max-w-[1800px] flex-col">
        <header className="flex items-end justify-between gap-6 border-b border-white/20 pb-[clamp(1rem,2vw,2rem)]">
          <div>
            {display.venueName ? <p className="mb-2 text-[clamp(.8rem,1.4vw,1.4rem)] font-semibold uppercase tracking-[0.16em] text-sky-300">{display.venueName}</p> : null}
            <h1 className="text-[clamp(2rem,5vw,5.5rem)] font-bold leading-none tracking-tight">{query.data?.site?.name ?? `Hållplats ${display.siteId}`}</h1>
          </div>
          <div className="text-right">
            <p className="text-[clamp(2rem,5vw,5rem)] font-semibold tabular-nums leading-none">{clock.format(now)}</p>
            <p className="mt-2 flex items-center justify-end gap-2 text-[clamp(.8rem,1.2vw,1.2rem)] text-white/65"><Radio className="size-[1em]" /> Uppdateras var {display.refreshSeconds}:e sekund</p>
          </div>
        </header>

        {stale ? (
          <div role="status" className="mt-5 flex items-center gap-3 rounded-lg bg-amber-300 px-4 py-3 font-bold text-slate-950">
            <AlertTriangle className="size-6" /> Trafikdatan är för gammal. Kontrollera avgången i SL-appen.
          </div>
        ) : null}

        <section className="min-h-0 flex-1 py-[clamp(1rem,2vw,2rem)]" aria-live="polite" aria-atomic="true">
          {query.isLoading ? (
            <div className="grid h-full place-items-center text-center text-white/70"><div><RefreshCw className="mx-auto mb-5 size-12 animate-spin motion-reduce:animate-none" /><p className="text-2xl">Hämtar avgångar</p></div></div>
          ) : query.isError ? (
            <div className="grid h-full place-items-center text-center"><div><WifiOff className="mx-auto mb-5 size-14 text-amber-300" /><h2 className="text-4xl font-bold">Nätverket svarar inte</h2><p className="mt-3 text-xl text-white/65">Skärmen försöker igen automatiskt.</p></div></div>
          ) : departures.length === 0 ? (
            <div className="grid h-full place-items-center text-center"><div><Clock3 className="mx-auto mb-5 size-14 text-sky-300" /><h2 className="text-4xl font-bold">Inga kommande avgångar</h2><p className="mt-3 text-xl text-white/65">Listan uppdateras automatiskt.</p></div></div>
          ) : (
            <div className="divide-y divide-white/15">
              {departures.map((departure) => (
                <article key={departure.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-[clamp(1rem,3vw,3rem)] py-[clamp(.8rem,1.5vw,1.5rem)]">
                  <Badge className="min-w-[clamp(3.5rem,6vw,7rem)] justify-center rounded-lg bg-sky-500 px-3 py-2 text-[clamp(1rem,2.4vw,2.4rem)] font-bold text-white hover:bg-sky-500">{departure.line || "–"}</Badge>
                  <div className="min-w-0">
                    <h2 className={`truncate text-[clamp(1.5rem,3.4vw,3.5rem)] font-semibold leading-tight ${departure.isCancelled ? "line-through text-white/50" : ""}`}>{departure.destination}</h2>
                    <p className="mt-1 text-[clamp(.8rem,1.4vw,1.4rem)] text-white/60">{departure.platform ? `Läge ${departure.platform}` : "Läge ej angivet"}{departure.status && departure.status !== "NORMAL" ? ` · ${departure.status}` : ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[clamp(2rem,4vw,4.5rem)] font-bold tabular-nums leading-none">{departure.isCancelled ? "Inställd" : departureTime(departure.expectedTime ?? departure.scheduledTime)}</p>
                    {departure.scheduledTime && departure.expectedTime && departure.scheduledTime !== departure.expectedTime ? <p className="mt-2 text-[clamp(.8rem,1.2vw,1.2rem)] text-white/60">Planerad {departureTime(departure.scheduledTime)}</p> : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="flex items-end justify-between gap-6 border-t border-white/20 pt-4">
          <p className="max-w-3xl text-[clamp(.75rem,1.1vw,1.1rem)] leading-relaxed text-white/55">Realtidsprognoser kan ändras. SL Commute Reliability visar avgångsdata, inte fullständig reseplanering.</p>
          {qr ? <div className="flex shrink-0 items-center gap-3"><p className="hidden text-right text-sm font-semibold text-white/70 sm:block">Öppna på mobilen</p><img src={qr} alt="QR-kod till denna avgångsskärm" className="size-[clamp(4rem,7vw,7rem)] rounded-md bg-white p-1" /></div> : null}
        </footer>
      </div>
    </main>
  );
}
