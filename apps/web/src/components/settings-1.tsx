"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Accessibility,
  AlertTriangle,
  ArrowRight,
  Check,
  Clock3,
  Copy,
  Plus,
  QrCode,
  Radio,
  Settings2,
  TrainFront,
  X
} from "lucide-react";
import Image from "next/image";
import QRCode from "qrcode";
import type { JourneyOption, Stop } from "@/api/types";
import { apiClient } from "@/api/client";
import { FavoriteStops } from "@/components/FavoriteStops";
import { NearbyStops } from "@/components/NearbyStops";
import { SearchBox } from "@/components/SearchBox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { calculateLeaveDecision } from "@/domain/timing";
import {
  ALL_TRANSPORT_MODES,
  MAX_VIA_STOPS,
  ROUTE_PREFERENCE_LABELS,
  TRANSPORT_MODE_LABELS,
  type CommuteProfile,
  type ObservationType,
  type ProfileStop,
  type RoutePreference,
  type TransportMode
} from "@/domain/models";
import { useCommuteProfile } from "@/hooks/useCommuteProfile";
import { useObservations } from "@/hooks/useObservations";
import { buildShareUrl } from "@/lib/shareProfile";

const isPlannerStop = (stop: ProfileStop) => !stop.id.startsWith("label:");

const toProfileStop = (stop: Stop): ProfileStop => ({
  id: stop.id,
  name: stop.name,
  gid: stop.gid
});

const formatDuration = (seconds: number) => {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
};

const formatClock = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
};

const parseLines = (value: string) => value.split(",").map((line) => line.trim()).filter(Boolean);

const newProfile = (input: {
  current?: CommuteProfile | null;
  originStop: Stop;
  destinationStop: ProfileStop;
  viaStops: ProfileStop[];
  preferredLines: string;
  avoidedLines: string;
  preferredModes: TransportMode[];
  routePreference: RoutePreference;
  wheelchairAccessible: boolean;
  walkingMinutes: number;
  transferBufferMinutes: number;
}): CommuteProfile => {
  const now = new Date().toISOString();
  return {
    id: input.current?.id ?? crypto.randomUUID(),
    name: input.current?.name ?? "Min vardagsresa",
    originStop: toProfileStop(input.originStop),
    destinationStop: input.destinationStop,
    viaStops: input.viaStops,
    destinations: [input.destinationStop, ...input.viaStops],
    destinationLabel: input.destinationStop.name,
    preferredLines: parseLines(input.preferredLines),
    avoidedLines: parseLines(input.avoidedLines),
    preferredModes: input.preferredModes.length ? input.preferredModes : [...ALL_TRANSPORT_MODES],
    routePreference: input.routePreference,
    wheelchairAccessible: input.wheelchairAccessible,
    timingRule: {
      walkingMinutes: Math.max(0, Math.min(60, input.walkingMinutes)),
      transferBufferMinutes: Math.max(0, Math.min(30, input.transferBufferMinutes))
    },
    createdAt: input.current?.createdAt ?? now,
    updatedAt: now
  };
};

function DecisionCard({ profile }: { profile: CommuteProfile | null }) {
  const [now, setNow] = useState(() => new Date());
  const query = useQuery({
    queryKey: ["commute-departures", profile?.originStop.id],
    queryFn: () => apiClient.departures(profile!.originStop.id),
    enabled: Boolean(profile),
    refetchInterval: 20_000,
    retry: 2
  });
  const { summary, addObservation } = useObservations(profile?.id);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  const decision = useMemo(() => {
    if (!profile || !query.data) {
      return { state: "insufficient", label: profile ? "Hämtar trafikdata" : "Lägg till din resa", detail: "Ditt beslut visas här." } as const;
    }
    return calculateLeaveDecision({
      departures: query.data.departures,
      preferredLines: profile.preferredLines,
      avoidedLines: profile.avoidedLines,
      timingRule: profile.timingRule,
      now,
      fetchedAt: new Date(query.data.fetchedAt)
    });
  }, [now, profile, query.data]);

  const currentDeparture = "departure" in decision ? decision.departure : undefined;
  const destinationName = profile?.destinationStop.name ?? profile?.destinationLabel;
  const record = (type: ObservationType) => {
    if (!profile) return;
    addObservation({
      type,
      siteId: profile.originStop.id,
      departureId: currentDeparture?.id,
      line: currentDeparture?.line,
      delayMinutes: type === "delay" ? 5 : undefined
    });
  };

  const tone =
    decision.state === "leave-now"
      ? "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]"
      : decision.state === "disruption" || decision.state === "stale"
        ? "bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]"
        : "bg-primary text-primary-foreground";

  return (
    <Card className="overflow-hidden border-0 shadow-xl shadow-primary/10" aria-live="polite">
      <CardContent className={`p-6 sm:p-8 ${tone}`}>
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0">
            <div className="mb-6 flex flex-wrap items-center gap-2 text-sm font-medium opacity-80">
              <Radio className="size-4" aria-hidden="true" />
              {profile ? `${profile.originStop.name} till ${destinationName}` : "Nästa resa"}
              {profile?.wheelchairAccessible ? (
                <Badge className="border-current/20 bg-background/15 text-inherit hover:bg-background/15">
                  <Accessibility className="size-3.5" aria-hidden="true" />
                  Rullstol
                </Badge>
              ) : null}
            </div>
            <p className="text-4xl font-bold tracking-tight sm:text-6xl">{decision.label}</p>
            <p className="mt-3 max-w-xl text-sm font-medium opacity-85 sm:text-base">{decision.detail}</p>
          </div>
          {decision.state === "disruption" || decision.state === "stale" ? (
            <AlertTriangle className="size-8 shrink-0" aria-hidden="true" />
          ) : (
            <Clock3 className="size-8 shrink-0" aria-hidden="true" />
          )}
        </div>
        {currentDeparture ? (
          <div className="mt-7 flex flex-wrap items-center gap-2 border-t border-current/20 pt-5">
            <Badge className="border-current/20 bg-background/15 text-inherit hover:bg-background/15">Linje {currentDeparture.line}</Badge>
            {currentDeparture.platform ? <span className="text-sm font-medium">Läge {currentDeparture.platform}</span> : null}
            <span className="text-sm opacity-75">Uppskattning från aktuell avgångsdata</span>
          </div>
        ) : null}
      </CardContent>
      {profile ? (
        <CardFooter className="flex flex-col items-stretch gap-4 border-t bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Stämmer inte prognosen?</p>
            <p className="text-xs text-muted-foreground">Sparas lokalt utan exakt position. {summary.totalObservations} observationer.</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Button size="sm" variant="outline" onClick={() => record("delay")}>Försenad</Button>
            <Button size="sm" variant="outline" onClick={() => record("cancellation")}>Inställd</Button>
            <Button size="sm" variant="outline" onClick={() => record("missing")}>Saknas</Button>
          </div>
        </CardFooter>
      ) : null}
    </Card>
  );
}

function JourneySuggestions({ profile }: { profile: CommuteProfile }) {
  const destination = isPlannerStop(profile.destinationStop) ? profile.destinationStop : null;
  const viaStops = useMemo(() => profile.viaStops.filter(isPlannerStop), [profile.viaStops]);

  const journeys = useQuery({
    queryKey: [
      "journeys",
      profile.originStop.id,
      destination?.id,
      viaStops.map((stop) => stop.id).join(","),
      profile.preferredModes.join(","),
      profile.routePreference,
      profile.wheelchairAccessible,
      profile.avoidedLines.join(",")
    ],
    queryFn: () =>
      apiClient.journeys({
        originId: profile.originStop.id,
        destinationId: destination!.id,
        viaIds: viaStops.map((stop) => stop.id),
        modes: profile.preferredModes,
        routePreference: profile.routePreference,
        wheelchairAccessible: profile.wheelchairAccessible,
        maxChanges: profile.routePreference === "leastinterchange" ? 2 : undefined
      }),
    enabled: Boolean(destination),
    refetchInterval: 60_000,
    retry: 1
  });

  const filteredJourneys = useMemo(() => {
    const avoided = new Set(profile.avoidedLines.map((line) => line.trim()).filter(Boolean));
    if (!journeys.data || avoided.size === 0) return journeys.data?.journeys ?? [];
    return journeys.data.journeys.filter(
      (journey) => !journey.legs.some((leg) => leg.line && avoided.has(leg.line))
    );
  }, [journeys.data, profile.avoidedLines]);

  if (!destination) {
    return (
      <section className="space-y-4" aria-labelledby="journeys-heading">
        <div>
          <h2 id="journeys-heading" className="text-xl font-semibold tracking-tight">
            Reseförslag
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Välj en slutstation för att se reseförslag och tillgänglighet.
          </p>
        </div>
      </section>
    );
  }

  const viaLabel =
    viaStops.length === 0
      ? null
      : viaStops.length === 1
        ? `via ${viaStops[0]!.name}`
        : `via ${viaStops.map((stop) => stop.name).join(" · ")}`;

  return (
    <section className="space-y-4" aria-labelledby="journeys-heading">
      <div>
        <h2 id="journeys-heading" className="text-xl font-semibold tracking-tight">
          Reseförslag
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {ROUTE_PREFERENCE_LABELS[profile.routePreference]}
          {profile.wheelchairAccessible ? " · rullstolspreferens" : ""}
          {viaLabel ? ` · ${viaLabel}` : ""}
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          {journeys.isFetching && !journeys.data ? <p className="text-sm text-muted-foreground">Hämtar reseförslag...</p> : null}
          {journeys.isError ? <p className="text-sm text-destructive">{journeys.error.message}</p> : null}
          {!journeys.isFetching && journeys.data && filteredJourneys.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Inga förslag kvar efter att undvikna linjer filtrerats bort.
            </p>
          ) : null}
          {filteredJourneys.map((journey) => (
            <JourneyOptionCard key={journey.id} journey={journey} preferWheelchair={profile.wheelchairAccessible} />
          ))}
        </CardContent>
      </Card>
    </section>
  );
}

function JourneyOptionCard({
  journey,
  preferWheelchair
}: {
  journey: JourneyOption;
  preferWheelchair: boolean;
}) {
  const firstDeparture = formatClock(journey.legs[0]?.departureTime);
  const lastArrival = formatClock(journey.legs[journey.legs.length - 1]?.arrivalTime);

  return (
    <div className="rounded-md border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">
            {firstDeparture && lastArrival ? `${firstDeparture} – ${lastArrival}` : formatDuration(journey.durationSeconds)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDuration(journey.durationSeconds)} · {journey.interchanges === 0 ? "Inga byten" : `${journey.interchanges} byte`}
          </p>
        </div>
        <Badge variant={journey.wheelchairFriendly ? "secondary" : "outline"}>
          <Accessibility className="size-3.5" aria-hidden="true" />
          {journey.wheelchairFriendly
            ? preferWheelchair
              ? "Inga kända tillgänglighetshinder"
              : "Inga hissvarningar"
            : "Tillgänglighetspåverkan"}
        </Badge>
      </div>
      <div className="mt-4 space-y-2">
        {journey.legs.map((leg, index) => (
          <div key={`${journey.id}-${index}`} className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="outline">{leg.line ? `${leg.mode ?? "Linje"} ${leg.line}` : leg.mode ?? "Gång"}</Badge>
            <span className="text-muted-foreground">
              {leg.originName} → {leg.destinationName}
            </span>
          </div>
        ))}
      </div>
      {journey.accessibilityNotes.length ? (
        <div className="mt-4 space-y-2 rounded-md bg-muted/50 p-3">
          {journey.accessibilityNotes.map((note) => (
            <p key={note} className="text-xs leading-5 text-muted-foreground">
              {note}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SelectedStopChip({
  stop,
  onRemove,
  wheelchairHint
}: {
  stop: ProfileStop;
  onRemove?: () => void;
  wheelchairHint?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/50 px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate font-medium">{stop.name}</span>
        {wheelchairHint ? (
          <Badge variant="secondary" className="shrink-0">
            <Accessibility className="size-3.5" aria-hidden="true" />
            Kollas i reseförslag
          </Badge>
        ) : null}
        {isPlannerStop(stop) ? <Badge variant="outline">{stop.id}</Badge> : <Badge variant="outline">Etikett</Badge>}
      </div>
      {onRemove ? (
        <Button type="button" size="icon" variant="ghost" aria-label={`Ta bort ${stop.name}`} onClick={onRemove}>
          <X className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}

export function Settings1() {
  const {
    profile,
    setProfile,
    hydrated,
    importedFromShare,
    pendingShare,
    shareImportError,
    acceptPendingShare,
    dismissPendingShare,
    clearShareImportError
  } = useCommuteProfile();
  const [originStop, setOriginStop] = useState<Stop | null>(null);
  const [destinationStop, setDestinationStop] = useState<ProfileStop | null>(null);
  const [viaStops, setViaStops] = useState<ProfileStop[]>([]);
  const [preferredLines, setPreferredLines] = useState("");
  const [avoidedLines, setAvoidedLines] = useState("");
  const [preferredModes, setPreferredModes] = useState<TransportMode[]>([...ALL_TRANSPORT_MODES]);
  const [routePreference, setRoutePreference] = useState<RoutePreference>("leasttime");
  const [wheelchairAccessible, setWheelchairAccessible] = useState(false);
  const [walkingMinutes, setWalkingMinutes] = useState(7);
  const [transferBufferMinutes, setTransferBufferMinutes] = useState(3);
  const [saved, setSaved] = useState(false);
  const [shareQr, setShareQr] = useState<string>();
  const [shareUrl, setShareUrl] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [addingVia, setAddingVia] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setOriginStop({ id: profile.originStop.id, name: profile.originStop.name, gid: profile.originStop.gid });
    setDestinationStop(profile.destinationStop);
    setViaStops(profile.viaStops);
    setPreferredLines(profile.preferredLines.join(", "));
    setAvoidedLines(profile.avoidedLines.join(", "));
    setPreferredModes(profile.preferredModes);
    setRoutePreference(profile.routePreference);
    setWheelchairAccessible(profile.wheelchairAccessible);
    setWalkingMinutes(profile.timingRule.walkingMinutes);
    setTransferBufferMinutes(profile.timingRule.transferBufferMinutes);
    setAddingVia(false);
  }, [profile]);

  useEffect(() => {
    if (!importedFromShare) return;
    setSaved(true);
    const timer = window.setTimeout(() => setSaved(false), 2000);
    return () => window.clearTimeout(timer);
  }, [importedFromShare]);

  useEffect(() => {
    if (!profile) {
      setShareQr(undefined);
      setShareUrl("");
      return;
    }

    let cancelled = false;
    const url = buildShareUrl(profile);
    setShareUrl(url);
    void QRCode.toDataURL(url, {
      width: 220,
      margin: 1,
      color: { dark: "#07121f", light: "#ffffff" }
    }).then((dataUrl) => {
      if (!cancelled) setShareQr(dataUrl);
    });

    return () => {
      cancelled = true;
    };
  }, [profile]);

  const toggleMode = (mode: TransportMode) => {
    setPreferredModes((current) => {
      if (current.includes(mode)) {
        if (current.length === 1) return current;
        return current.filter((item) => item !== mode);
      }
      return [...current, mode];
    });
  };

  const setEndStation = (stop: Stop) => {
    const next = toProfileStop(stop);
    setDestinationStop(next);
    setViaStops((current) => current.filter((item) => item.id !== next.id));
  };

  const setStartStation = (stop: Stop) => {
    setOriginStop(stop);
    setViaStops((current) => current.filter((item) => item.id !== stop.id));
  };

  const addViaStop = (stop: Stop) => {
    if (originStop?.id === stop.id || destinationStop?.id === stop.id) return;
    setViaStops((current) => {
      if (current.length >= MAX_VIA_STOPS) return current;
      if (current.some((item) => item.id === stop.id)) return current;
      return [...current, toProfileStop(stop)];
    });
    setAddingVia(false);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!originStop || !destinationStop) return;
    setProfile(
      newProfile({
        current: profile,
        originStop,
        destinationStop,
        viaStops,
        preferredLines,
        avoidedLines,
        preferredModes,
        routePreference,
        wheelchairAccessible,
        walkingMinutes,
        transferBufferMinutes
      })
    );
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  const copyShareLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Clipboard may be blocked; QR still works.
    }
  };

  return (
    <div className="space-y-10">
      {pendingShare ? (
        <Alert>
          <AlertTitle>Importera delad pendling?</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              Länken pekar på {pendingShare.origin.name} → {pendingShare.destination.name}
              {pendingShare.viaStops?.length
                ? ` via ${pendingShare.viaStops.map((stop) => stop.name).join(", ")}`
                : ""}
              . Hållplatsnamnen är verifierade mot SL:s katalog. Vill du ersätta din sparade resa?
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={acceptPendingShare}>
                Importera
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={dismissPendingShare}>
                Behåll min
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      {shareImportError ? (
        <Alert variant="destructive">
          <AlertTitle>Kunde inte importera delning</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <p>{shareImportError}</p>
            <Button type="button" size="sm" variant="outline" onClick={clearShareImportError}>
              Stäng
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {/* 1. Answer first */}
      <DecisionCard profile={profile} />

      {/* 2. Configure the trip that drives the answer */}
      <section className="space-y-4" aria-labelledby="commute-heading">
        <div>
          <h2 id="commute-heading" className="text-xl font-semibold tracking-tight">
            Din pendling
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Välj start, slutstation och eventuella via-hållplatser. Gå-nu och reseförslag bygger på det här.
          </p>
        </div>

        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-md bg-primary/10 text-primary">
                <Settings2 className="size-5" aria-hidden="true" />
              </div>
              <div>
                <CardTitle>
                  <span className="text-lg">Ställ in resa</span>
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Sparas bara i den här webbläsaren.</p>
              </div>
            </div>
          </CardHeader>
          <form onSubmit={submit}>
            <CardContent className="space-y-6 pt-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <Field>
                  <FieldLabel>Startstation</FieldLabel>
                  {originStop ? (
                    <div className="mb-2">
                      <SelectedStopChip
                        stop={originStop}
                        wheelchairHint={wheelchairAccessible}
                        onRemove={() => setOriginStop(null)}
                      />
                    </div>
                  ) : null}
                  <SearchBox
                    onSelect={setStartStation}
                    placeholder="Sök och välj startstation"
                    enableNearby
                  />
                </Field>

                <Field>
                  <FieldLabel>Slutstation</FieldLabel>
                  {destinationStop ? (
                    <div className="mb-2">
                      <SelectedStopChip
                        stop={destinationStop}
                        wheelchairHint={wheelchairAccessible}
                        onRemove={() => setDestinationStop(null)}
                      />
                    </div>
                  ) : null}
                  <SearchBox onSelect={setEndStation} placeholder="Sök och välj slutstation" />
                  <p className="mt-2 text-xs text-muted-foreground">Hållplatsen du pendlar till.</p>
                </Field>
              </div>

              <Field>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <FieldLabel>Via-hållplatser</FieldLabel>
                  {!addingVia && viaStops.length < MAX_VIA_STOPS ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => setAddingVia(true)}>
                      <Plus className="size-4" />
                      Lägg till
                    </Button>
                  ) : null}
                </div>
                {viaStops.length > 0 ? (
                  <div className="mb-2 space-y-2">
                    {viaStops.map((stop) => (
                      <SelectedStopChip
                        key={stop.id}
                        stop={stop}
                        wheelchairHint={wheelchairAccessible}
                        onRemove={() => setViaStops((current) => current.filter((item) => item.id !== stop.id))}
                      />
                    ))}
                  </div>
                ) : null}
                {addingVia ? (
                  <div className="mt-2">
                    <SearchBox onSelect={addViaStop} placeholder="Sök och välj via-hållplats" />
                  </div>
                ) : null}
                <p className="mt-2 text-xs text-muted-foreground">
                  Valfritt, högst {MAX_VIA_STOPS}. Reseförslag måste passera dessa hållplatser mellan start och slut.
                </p>
              </Field>

              <Field>
                <FieldLabel>Föredragna trafikslag</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {ALL_TRANSPORT_MODES.map((mode) => {
                    const active = preferredModes.includes(mode);
                    return (
                      <Button
                        key={mode}
                        type="button"
                        size="sm"
                        variant={active ? "default" : "outline"}
                        aria-pressed={active}
                        onClick={() => toggleMode(mode)}
                      >
                        {TRANSPORT_MODE_LABELS[mode]}
                      </Button>
                    );
                  })}
                </div>
              </Field>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="route-preference">Resepreferens</FieldLabel>
                  <Select value={routePreference} onValueChange={(value) => setRoutePreference(value as RoutePreference)}>
                    <SelectTrigger id="route-preference" aria-label="Resepreferens">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ROUTE_PREFERENCE_LABELS) as RoutePreference[]).map((value) => (
                        <SelectItem key={value} value={value}>
                          {ROUTE_PREFERENCE_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="wheelchair">Rullstolsanpassning</FieldLabel>
                  <Button
                    id="wheelchair"
                    type="button"
                    variant={wheelchairAccessible ? "default" : "outline"}
                    className="w-full justify-start"
                    aria-pressed={wheelchairAccessible}
                    onClick={() => setWheelchairAccessible((value) => !value)}
                  >
                    <Accessibility className="size-4" />
                    {wheelchairAccessible ? "Visar tillgänglighet" : "Visa tillgänglighet"}
                  </Button>
                </Field>
                <Field>
                  <FieldLabel htmlFor="lines">Föredragna linjer</FieldLabel>
                  <Input
                    id="lines"
                    value={preferredLines}
                    onChange={(event) => setPreferredLines(event.target.value)}
                    placeholder="13, 14, 4"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="avoided-lines">Linjer att undvika</FieldLabel>
                  <Input
                    id="avoided-lines"
                    value={avoidedLines}
                    onChange={(event) => setAvoidedLines(event.target.value)}
                    placeholder="17, 19"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="walking">Gångtid, minuter</FieldLabel>
                  <Input
                    id="walking"
                    type="number"
                    min={0}
                    max={60}
                    value={walkingMinutes}
                    onChange={(event) => setWalkingMinutes(Number(event.target.value))}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="buffer">Marginal, minuter</FieldLabel>
                  <Input
                    id="buffer"
                    type="number"
                    min={0}
                    max={30}
                    value={transferBufferMinutes}
                    onChange={(event) => setTransferBufferMinutes(Number(event.target.value))}
                  />
                </Field>
              </div>
            </CardContent>
            <CardFooter className="justify-end gap-3 border-t pt-6">
              {saved ? (
                <span className="flex items-center gap-1 text-sm font-medium text-[hsl(var(--success))]">
                  <Check className="size-4" /> Sparad
                </span>
              ) : null}
              <Button type="submit" disabled={!hydrated || !originStop || !destinationStop}>
                <ArrowRight className="size-4" /> Reseförslag
              </Button>
            </CardFooter>
          </form>
        </Card>
      </section>

      {/* 3. Journey options for the saved trip */}
      {profile ? <JourneySuggestions profile={profile} /> : null}

      {/* 4. Discover / browse stops */}
      <section className="space-y-4" aria-labelledby="stops-heading">
        <div>
          <h2 id="stops-heading" className="text-xl font-semibold tracking-tight">
            Hitta hållplats
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sök avgångar, öppna favoriter eller hitta hållplatser nära dig.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sök hållplats</CardTitle>
            <p className="text-sm text-muted-foreground">Välj en station för realtidsavgångar.</p>
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

      {/* 5. Secondary tools */}
      <section className="space-y-4 border-t pt-8" aria-labelledby="tools-heading">
        <div>
          <h2 id="tools-heading" className="text-lg font-semibold tracking-tight">
            Övrigt
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Verktyg som inte behövs för den dagliga pendlingen.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <QrCode className="size-5 text-primary" aria-hidden="true" />
                <CardTitle>
                  <h3 className="text-lg">Dela resa</h3>
                </CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                Skapa en QR-kod från dina sparade inställningar under Ställ in resa.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {!profile ? (
                <p className="text-sm text-muted-foreground">
                  Spara en resa ovan för att generera en QR-kod.
                </p>
              ) : (
                <>
                  <div className="flex justify-center rounded-lg bg-white p-4">
                    {shareQr ? (
                      <Image
                        src={shareQr}
                        alt="QR-kod för delad resa"
                        width={220}
                        height={220}
                        unoptimized
                        data-share-url={shareUrl}
                      />
                    ) : (
                      <div className="grid size-[220px] place-items-center text-sm text-slate-500">
                        Skapar QR-kod…
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Skanna koden på en annan enhet för att öppna appen med samma start, destination och preferenser.
                  </p>
                  <Button
                    className="w-full"
                    variant="outline"
                    type="button"
                    disabled={!shareUrl}
                    onClick={() => void copyShareLink()}
                  >
                    {linkCopied ? (
                      <>
                        <Check className="size-4" /> Länk kopierad
                      </>
                    ) : (
                      <>
                        <Copy className="size-4" /> Kopiera länk
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-muted/40">
            <CardContent className="pt-6">
              <TrainFront className="mb-4 size-6 text-primary" aria-hidden="true" />
              <p className="font-semibold">Så fungerar det</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Gå-nu bygger på avgångar, gångtid och marginal. Reseförslag kommer från SL Journey Planner utifrån dina
                trafikslag och preferenser. Tillgänglighet visar kända hiss- och anläggningsstörningar.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
