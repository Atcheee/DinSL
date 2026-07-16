"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Building2, Check, Clock3, Radio, Save, Settings2, TrainFront } from "lucide-react";
import type { Stop } from "@/api/types";
import { apiClient } from "@/api/client";
import { SearchBox } from "@/components/SearchBox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { calculateLeaveDecision } from "@/domain/timing";
import type { CommuteProfile, ObservationType } from "@/domain/models";
import { useCommuteProfile } from "@/hooks/useCommuteProfile";
import { useObservations } from "@/hooks/useObservations";

const newProfile = (input: {
  current?: CommuteProfile | null;
  originStop: Stop;
  destinationLabel: string;
  preferredLines: string;
  walkingMinutes: number;
  transferBufferMinutes: number;
}): CommuteProfile => {
  const now = new Date().toISOString();
  return {
    id: input.current?.id ?? crypto.randomUUID(),
    name: input.current?.name ?? "Min vardagsresa",
    originStop: { id: input.originStop.id, name: input.originStop.name },
    destinationLabel: input.destinationLabel.trim(),
    preferredLines: input.preferredLines.split(",").map((line) => line.trim()).filter(Boolean),
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
      timingRule: profile.timingRule,
      now,
      fetchedAt: new Date(query.data.fetchedAt)
    });
  }, [now, profile, query.data]);

  const currentDeparture = "departure" in decision ? decision.departure : undefined;
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
            <div className="mb-6 flex items-center gap-2 text-sm font-medium opacity-80">
              <Radio className="size-4" aria-hidden="true" />
              {profile ? `${profile.originStop.name} till ${profile.destinationLabel}` : "Nästa resa"}
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

export function Settings1() {
  const { profile, setProfile, hydrated } = useCommuteProfile();
  const [originStop, setOriginStop] = useState<Stop | null>(null);
  const [destinationLabel, setDestinationLabel] = useState("");
  const [preferredLines, setPreferredLines] = useState("");
  const [walkingMinutes, setWalkingMinutes] = useState(7);
  const [transferBufferMinutes, setTransferBufferMinutes] = useState(3);
  const [saved, setSaved] = useState(false);
  const [displayToken, setDisplayToken] = useState("");

  useEffect(() => {
    if (!profile) return;
    setOriginStop(profile.originStop);
    setDestinationLabel(profile.destinationLabel);
    setPreferredLines(profile.preferredLines.join(", "));
    setWalkingMinutes(profile.timingRule.walkingMinutes);
    setTransferBufferMinutes(profile.timingRule.transferBufferMinutes);
  }, [profile]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!originStop || !destinationLabel.trim()) return;
    setProfile(newProfile({ current: profile, originStop, destinationLabel, preferredLines, walkingMinutes, transferBufferMinutes }));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <DecisionCard profile={profile} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-md bg-primary/10 text-primary"><Settings2 className="size-5" /></div>
              <div>
                <CardTitle><h2 className="text-xl">Din pendling</h2></CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Sparas bara i den här webbläsaren.</p>
              </div>
            </div>
          </CardHeader>
          <form onSubmit={submit}>
            <CardContent className="space-y-6 pt-6">
              <Field>
                <FieldLabel>Startstation</FieldLabel>
                {originStop ? (
                  <div className="mb-2 flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2">
                    <span className="font-medium">{originStop.name}</span>
                    <Badge variant="outline">{originStop.id}</Badge>
                  </div>
                ) : null}
                <SearchBox onSelect={setOriginStop} placeholder="Sök och välj startstation" />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="destination">Destination</FieldLabel>
                  <Input id="destination" value={destinationLabel} onChange={(event) => setDestinationLabel(event.target.value)} placeholder="Till exempel Kontoret" required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="lines">Föredragna linjer</FieldLabel>
                  <Input id="lines" value={preferredLines} onChange={(event) => setPreferredLines(event.target.value)} placeholder="13, 14, 4" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="walking">Gångtid, minuter</FieldLabel>
                  <Input id="walking" type="number" min={0} max={60} value={walkingMinutes} onChange={(event) => setWalkingMinutes(Number(event.target.value))} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="buffer">Marginal, minuter</FieldLabel>
                  <Input id="buffer" type="number" min={0} max={30} value={transferBufferMinutes} onChange={(event) => setTransferBufferMinutes(Number(event.target.value))} />
                </Field>
              </div>
            </CardContent>
            <CardFooter className="justify-end gap-3 border-t pt-6">
              {saved ? <span className="flex items-center gap-1 text-sm font-medium text-[hsl(var(--success))]"><Check className="size-4" /> Sparad</span> : null}
              <Button type="submit" disabled={!hydrated || !originStop || !destinationLabel.trim()}><Save className="size-4" /> Spara resa</Button>
            </CardFooter>
          </form>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2"><Building2 className="size-5 text-primary" /><CardTitle><h2 className="text-lg">Publik skärm</h2></CardTitle></div>
              <p className="text-sm text-muted-foreground">Öppna en hanterad skärm med långlivad, återkallbar token.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field>
                <FieldLabel htmlFor="display-token">Skärmtoken</FieldLabel>
                <Input id="display-token" type="password" autoComplete="off" value={displayToken} onChange={(event) => setDisplayToken(event.target.value)} placeholder="Klistra in token" />
              </Field>
              <Button className="w-full" variant="outline" disabled={!displayToken.trim()} onClick={() => window.location.assign(`/display/${encodeURIComponent(displayToken.trim())}`)}>
                Öppna skärm <ArrowRight className="size-4" />
              </Button>
            </CardContent>
          </Card>
          <Card className="bg-muted/40">
            <CardContent className="pt-6">
              <TrainFront className="mb-4 size-6 text-primary" />
              <p className="font-semibold">Avgångsbaserad MVP</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Beslutet använder nästa avgång, gångtid och marginal. Det är inte en fullständig reseplan.</p>
              <Separator className="my-4" />
              <p className="text-xs text-muted-foreground">Data uppdateras ungefär var 20:e sekund.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
