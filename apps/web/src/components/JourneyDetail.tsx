"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Accessibility,
  CalendarPlus,
  ExternalLink,
  MapPinned
} from "lucide-react";
import type { JourneyOption } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildAppleMapsUrl,
  buildGoogleCalendarUrl,
  buildGoogleMapsUrl,
  downloadIcs,
  journeyDestinationName,
  journeyOriginName
} from "@/lib/journeyExport";
import { loadJourneySnapshot } from "@/lib/journeyStorage";
import { formatJourneyClock, formatJourneyDuration } from "@/lib/time";

type JourneyDetailProps = {
  journeyId: string;
};

const interchangeLabel = (count: number) => {
  if (count === 0) return "Inga byten";
  if (count === 1) return "1 byte";
  return `${count} byten`;
};

const legBadgeLabel = (mode?: string, line?: string) =>
  line ? `${mode ?? "Linje"} ${line}` : (mode ?? "Gång");

export function JourneyDetail({ journeyId }: JourneyDetailProps) {
  const [journey, setJourney] = useState<JourneyOption | null | undefined>(undefined);

  useEffect(() => {
    setJourney(loadJourneySnapshot(journeyId));
  }, [journeyId]);

  if (journey === undefined) {
    return <p className="text-sm text-muted-foreground">Hämtar resa...</p>;
  }

  if (!journey) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resan kunde inte hittas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Reseförslag sparas tillfälligt i den här fliken. Gå tillbaka och välj ett förslag igen.
          </p>
          <Button asChild>
            <Link href="/">Tillbaka till reseförslag</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const origin = journeyOriginName(journey);
  const destination = journeyDestinationName(journey);
  const firstDeparture = formatJourneyClock(journey.legs[0]?.departureTime);
  const lastArrival = formatJourneyClock(journey.legs[journey.legs.length - 1]?.arrivalTime);
  const googleCalendarUrl = buildGoogleCalendarUrl(journey);
  const googleMapsUrl = buildGoogleMapsUrl(journey);
  const appleMapsUrl = buildAppleMapsUrl(journey);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Resedetaljer</h1>
        <p className="text-muted-foreground">
          {origin} → {destination}
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xl font-semibold">
                {firstDeparture && lastArrival
                  ? `${firstDeparture} – ${lastArrival}`
                  : formatJourneyDuration(journey.durationSeconds)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatJourneyDuration(journey.durationSeconds)} · {interchangeLabel(journey.interchanges)}
              </p>
            </div>
            <Badge variant={journey.wheelchairFriendly ? "secondary" : "outline"}>
              <Accessibility className="size-3.5" aria-hidden="true" />
              {journey.wheelchairFriendly ? "Inga hissvarningar" : "Tillgänglighetspåverkan"}
            </Badge>
          </div>

          <ol className="space-y-4 border-l border-border pl-4">
            {journey.legs.map((leg, index) => {
              const dep = formatJourneyClock(leg.departureTime);
              const arr = formatJourneyClock(leg.arrivalTime);
              return (
                <li key={`${journey.id}-${index}`} className="relative space-y-1">
                  <span
                    className="absolute -left-[1.3125rem] top-1.5 size-2.5 rounded-full bg-foreground"
                    aria-hidden="true"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{legBadgeLabel(leg.mode, leg.line)}</Badge>
                    {dep && arr ? (
                      <span className="text-sm text-muted-foreground">
                        {dep} – {arr}
                      </span>
                    ) : null}
                    {leg.durationSeconds != null ? (
                      <span className="text-sm text-muted-foreground">
                        · {formatJourneyDuration(leg.durationSeconds)}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm">
                    {leg.originName} → {leg.destinationName}
                  </p>
                  {leg.infos.length ? (
                    <ul className="space-y-1">
                      {leg.infos.map((info) => (
                        <li key={info} className="text-xs text-muted-foreground">
                          {info}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ol>

          {journey.accessibilityNotes.length ? (
            <div className="space-y-2 rounded-md bg-muted/50 p-3">
              {journey.accessibilityNotes.map((note) => (
                <p key={note} className="text-xs leading-5 text-muted-foreground">
                  {note}
                </p>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <section className="space-y-3" aria-labelledby="export-heading">
        <h2 id="export-heading" className="text-lg font-semibold tracking-tight">
          Spara / öppna
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => downloadIcs(journey)}
            disabled={!googleCalendarUrl}
          >
            <CalendarPlus data-icon="inline-start" />
            Lägg till i kalender
          </Button>
          {googleCalendarUrl ? (
            <Button variant="outline" asChild>
              <a href={googleCalendarUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink data-icon="inline-start" />
                Google Kalender
              </a>
            </Button>
          ) : null}
          {googleMapsUrl ? (
            <Button variant="outline" asChild>
              <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
                <MapPinned data-icon="inline-start" />
                Google Maps
              </a>
            </Button>
          ) : null}
          {appleMapsUrl ? (
            <Button variant="outline" asChild>
              <a href={appleMapsUrl} target="_blank" rel="noopener noreferrer">
                <MapPinned data-icon="inline-start" />
                Apple Maps
              </a>
            </Button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
