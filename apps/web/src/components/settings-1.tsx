"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Accessibility,
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
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
import Link from "next/link";
import QRCode from "qrcode";
import type { JourneyOption, Stop } from "@/api/types";
import { apiClient } from "@/api/client";
import { FavoriteStops } from "@/components/FavoriteStops";
import { NearbyStops } from "@/components/NearbyStops";
import { SearchBox } from "@/components/SearchBox";
import { TransitBadge } from "@/components/TransitBadge";
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
  type JourneySearchMode,
  type ObservationType,
  type ProfileStop,
  type RoutePreference,
  type TransportMode
} from "@/domain/models";
import { useCommuteProfile } from "@/hooks/useCommuteProfile";
import { useObservations } from "@/hooks/useObservations";
import { saveJourneySnapshot } from "@/lib/journeyStorage";
import { buildShareUrl } from "@/lib/shareProfile";
import { formatJourneyClock, formatJourneyDuration } from "@/lib/time";

const isPlannerStop = (stop: ProfileStop) => !stop.id.startsWith("label:");

const toProfileStop = (stop: Stop): ProfileStop => ({
  id: stop.id,
  name: stop.name,
  gid: stop.gid
});

const parseLines = (value: string) => value.split(",").map((line) => line.trim()).filter(Boolean);

type JourneySearchSelection = {
  mode: JourneySearchMode;
  date: string;
  time: string;
};

type PlannerDraft = {
  originStop: Stop | null;
  destinationStop: ProfileStop | null;
  viaStops: ProfileStop[];
  preferredLines: string;
  avoidedLines: string;
  preferredModes: TransportMode[];
  routePreference: RoutePreference;
  wheelchairAccessible: boolean;
  journeySearchMode: JourneySearchMode;
  journeyDate: string;
  journeyTime: string;
  journeySearch: JourneySearchSelection;
  walkingMinutes: number;
  transferBufferMinutes: number;
};

const PLANNER_DRAFT_STORAGE_KEY = "dinsl:planner-draft:v1";
const DEPARTURES_SEARCH_STORAGE_KEY = "dinsl:departures-search:v1";

const readPlannerDraft = (): PlannerDraft | null => {
  try {
    const raw = window.sessionStorage.getItem(PLANNER_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as PlannerDraft;
    if (
      !Array.isArray(draft.viaStops) ||
      !Array.isArray(draft.preferredModes) ||
      typeof draft.preferredLines !== "string" ||
      typeof draft.avoidedLines !== "string" ||
      typeof draft.walkingMinutes !== "number" ||
      typeof draft.transferBufferMinutes !== "number"
    ) {
      return null;
    }
    return draft;
  } catch {
    return null;
  }
};

const persistPlannerDraft = (draft: PlannerDraft) => {
  try {
    window.sessionStorage.setItem(PLANNER_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Keep the form working when storage is unavailable.
  }
};

const localDateValue = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const localTimeValue = (date: Date) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

const defaultScheduledTime = () => {
  const date = new Date(Date.now() + 30 * 60_000);
  date.setSeconds(0, 0);
  return { date: localDateValue(date), time: localTimeValue(date) };
};

const formatJourneySearch = (search: JourneySearchSelection) => {
  if (search.mode === "now") return "Avgångar från nu";
  const [year, month, day] = search.date.split("-").map(Number);
  const date = new Date(year!, month! - 1, day, 12);
  const formattedDate = new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "long"
  }).format(date);
  return search.mode === "arrival"
    ? `Framme ${formattedDate} kl. ${search.time}`
    : `Avgång ${formattedDate} kl. ${search.time}`;
};

const JOURNEY_PAGE_SIZE = 3;
const STOCKHOLM_TIME_ZONE = "Europe/Stockholm";

const journeyDepartureTime = (journey: JourneyOption) => journey.legs[0]?.departureTime;

const journeyArrivalTime = (journey: JourneyOption) =>
  journey.legs[journey.legs.length - 1]?.arrivalTime;

const journeyTime = (journey: JourneyOption) => {
  const raw = journeyDepartureTime(journey);
  if (!raw) return Number.POSITIVE_INFINITY;
  const value = Date.parse(raw);
  return Number.isNaN(value) ? Number.POSITIVE_INFINITY : value;
};

const uniqueSortedJourneys = (journeys: JourneyOption[]) => {
  const unique = new Map<string, JourneyOption>();
  journeys.forEach((journey) => unique.set(journey.id, journey));
  return [...unique.values()].sort((left, right) => journeyTime(left) - journeyTime(right));
};

const searchAtJourneyTime = (
  value: string,
  mode: Exclude<JourneySearchMode, "now">,
  minuteOffset: number
) => {
  const date = new Date(value);
  date.setUTCMinutes(date.getUTCMinutes() + minuteOffset, 0, 0);

  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: STOCKHOLM_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";

  return {
    searchMode: mode,
    searchDate: `${part("year")}-${part("month")}-${part("day")}`,
    searchTime: `${part("hour")}:${part("minute")}`
  };
};

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
    <Card className="flex flex-col overflow-hidden border-0 shadow-lg shadow-primary/10 xl:h-96" aria-live="polite">
      <CardContent className={`flex-1 p-5 sm:p-6 ${tone}`}>
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm font-medium opacity-80">
              <Radio className="size-4" aria-hidden="true" />
              {profile ? `${profile.originStop.name} till ${destinationName}` : "Nästa resa"}
              {profile?.wheelchairAccessible ? (
                <Badge className="border-current/20 bg-background/15 text-inherit hover:bg-background/15">
                  <Accessibility className="size-3.5" aria-hidden="true" />
                  Rullstol
                </Badge>
              ) : null}
            </div>
            <p className="text-3xl font-bold tracking-tight sm:text-5xl">{decision.label}</p>
            <p className="mt-3 max-w-xl text-sm font-medium opacity-85 sm:text-base">{decision.detail}</p>
          </div>
          {decision.state === "disruption" || decision.state === "stale" ? (
            <AlertTriangle className="size-8 shrink-0" aria-hidden="true" />
          ) : (
            <Clock3 className="size-8 shrink-0" aria-hidden="true" />
          )}
        </div>
        {currentDeparture ? (
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-current/20 pt-4">
            <Badge className="border-current/20 bg-background/15 text-inherit hover:bg-background/15">Linje {currentDeparture.line}</Badge>
            {currentDeparture.platform ? <span className="text-sm font-medium">Läge {currentDeparture.platform}</span> : null}
            <span className="text-sm opacity-75">Uppskattning från aktuell avgångsdata</span>
          </div>
        ) : null}
      </CardContent>
      {profile ? (
        <CardFooter className="flex flex-col items-stretch gap-3 border-t bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
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

function JourneySuggestions({
  profile,
  search
}: {
  profile: CommuteProfile;
  search: JourneySearchSelection;
}) {
  const destination = isPlannerStop(profile.destinationStop) ? profile.destinationStop : null;
  const viaStops = useMemo(() => profile.viaStops.filter(isPlannerStop), [profile.viaStops]);
  const [earlierJourneys, setEarlierJourneys] = useState<JourneyOption[]>([]);
  const [laterJourneys, setLaterJourneys] = useState<JourneyOption[]>([]);
  const [loadingDirection, setLoadingDirection] = useState<"earlier" | "later" | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const journeyRequest = {
    originId: profile.originStop.id,
    destinationId: destination?.id ?? "",
    viaIds: viaStops.map((stop) => stop.id),
    modes: profile.preferredModes,
    routePreference: profile.routePreference,
    wheelchairAccessible: profile.wheelchairAccessible,
    maxChanges: profile.routePreference === "leastinterchange" ? 2 : undefined
  } as const;

  const journeyWindowKey = [
    journeyRequest.originId,
    journeyRequest.destinationId,
    journeyRequest.viaIds.join(","),
    journeyRequest.modes.join(","),
    journeyRequest.routePreference,
    journeyRequest.wheelchairAccessible,
    journeyRequest.maxChanges,
    profile.avoidedLines.join(","),
    search.mode,
    search.date,
    search.time
  ].join("|");

  useEffect(() => {
    setEarlierJourneys([]);
    setLaterJourneys([]);
    setLoadError(null);
  }, [journeyWindowKey]);

  const journeys = useQuery({
    queryKey: [
      "journeys",
      profile.originStop.id,
      destination?.id,
      viaStops.map((stop) => stop.id).join(","),
      profile.preferredModes.join(","),
      profile.routePreference,
      profile.wheelchairAccessible,
      profile.avoidedLines.join(","),
      search.mode,
      search.date,
      search.time
    ],
    queryFn: () =>
      apiClient.journeys({
        ...journeyRequest,
        destinationId: destination!.id,
        searchMode: search.mode,
        searchDate: search.mode === "now" ? undefined : search.date,
        searchTime: search.mode === "now" ? undefined : search.time
      }),
    enabled: Boolean(destination),
    refetchInterval: 60_000,
    retry: 1
  });

  const journeyWindow = useMemo(() => {
    const initialJourneys = journeys.data?.journeys.slice(0, JOURNEY_PAGE_SIZE) ?? [];
    return uniqueSortedJourneys([...earlierJourneys, ...initialJourneys, ...laterJourneys]);
  }, [earlierJourneys, journeys.data, laterJourneys]);

  const filteredJourneys = useMemo(() => {
    const avoided = new Set(profile.avoidedLines.map((line) => line.trim()).filter(Boolean));
    if (avoided.size === 0) return journeyWindow;
    return journeyWindow.filter(
      (journey) => !journey.legs.some((leg) => leg.line && avoided.has(leg.line))
    );
  }, [journeyWindow, profile.avoidedLines]);

  const loadJourneys = async (direction: "earlier" | "later") => {
    const edgeJourney =
      direction === "earlier" ? journeyWindow[0] : journeyWindow[journeyWindow.length - 1];
    const edgeTime =
      direction === "earlier"
        ? journeyArrivalTime(edgeJourney!)
        : journeyDepartureTime(edgeJourney!);
    if (!edgeJourney || !edgeTime || !destination) return;

    setLoadingDirection(direction);
    setLoadError(null);
    try {
      const response = await apiClient.journeys({
        ...journeyRequest,
        destinationId: destination.id,
        ...searchAtJourneyTime(
          edgeTime,
          direction === "earlier" ? "arrival" : "departure",
          direction === "earlier" ? -1 : 1
        )
      });
      const page = uniqueSortedJourneys(response.journeys);
      if (direction === "earlier") {
        setEarlierJourneys((current) =>
          uniqueSortedJourneys([...current, ...page.slice(-JOURNEY_PAGE_SIZE)])
        );
      } else {
        setLaterJourneys((current) =>
          uniqueSortedJourneys([...current, ...page.slice(0, JOURNEY_PAGE_SIZE)])
        );
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Kunde inte hämta fler reseförslag.");
    } finally {
      setLoadingDirection(null);
    }
  };

  if (!destination) {
    return (
      <section className="space-y-4 scroll-mt-4" aria-labelledby="journeys-heading">
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
    <section className="space-y-4 scroll-mt-4" aria-labelledby="journeys-heading">
      <div>
        <h2 id="journeys-heading" className="text-xl font-semibold tracking-tight">
          Reseförslag
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {ROUTE_PREFERENCE_LABELS[profile.routePreference]}
          {profile.wheelchairAccessible ? " · rullstolspreferens" : ""}
          {viaLabel ? ` · ${viaLabel}` : ""}
          {` · ${formatJourneySearch(search)}`}
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          {journeys.isFetching && !journeys.data ? <p className="text-sm text-muted-foreground">Hämtar reseförslag...</p> : null}
          {journeys.isError ? <p className="text-sm text-destructive">{journeys.error.message}</p> : null}
          {!journeys.isFetching && journeys.data && filteredJourneys.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {profile.avoidedLines.some((line) => line.trim())
                ? "Inga förslag kvar efter att undvikna linjer filtrerats bort."
                : "Inga reseförslag hittades just nu. Prova andra hållplatser eller preferenser."}
            </p>
          ) : null}
          {journeyWindow.length ? (
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={loadingDirection !== null}
              onClick={() => void loadJourneys("earlier")}
            >
              <ChevronUp className="size-4" aria-hidden="true" />
              {loadingDirection === "earlier" ? "Hämtar tidigare resor..." : "Visa 3 tidigare resor"}
            </Button>
          ) : null}
          {filteredJourneys.map((journey) => (
            <JourneyOptionCard key={journey.id} journey={journey} preferWheelchair={profile.wheelchairAccessible} />
          ))}
          {journeyWindow.length ? (
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={loadingDirection !== null}
              onClick={() => void loadJourneys("later")}
            >
              <ChevronDown className="size-4" aria-hidden="true" />
              {loadingDirection === "later" ? "Hämtar senare resor..." : "Visa 3 senare resor"}
            </Button>
          ) : null}
          {loadError ? (
            <p className="text-center text-sm text-destructive" role="alert">
              {loadError}
            </p>
          ) : null}
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
  const firstDeparture = formatJourneyClock(journey.legs[0]?.departureTime);
  const lastArrival = formatJourneyClock(journey.legs[journey.legs.length - 1]?.arrivalTime);
  const timeLabel =
    firstDeparture && lastArrival
      ? `${firstDeparture} – ${lastArrival}`
      : formatJourneyDuration(journey.durationSeconds);

  return (
    <Link
      href={`/resa/${encodeURIComponent(journey.id)}`}
      onClick={() => saveJourneySnapshot(journey)}
      className="block rounded-md border p-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`Visa detaljer för resa ${timeLabel}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{timeLabel}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatJourneyDuration(journey.durationSeconds)} ·{" "}
            {journey.interchanges === 0
              ? "Inga byten"
              : journey.interchanges === 1
                ? "1 byte"
                : `${journey.interchanges} byten`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={journey.wheelchairFriendly ? "secondary" : "outline"}>
            <Accessibility className="size-3.5" aria-hidden="true" />
            {journey.wheelchairFriendly
              ? preferWheelchair
                ? "Inga kända tillgänglighetshinder"
                : "Inga hissvarningar"
              : "Tillgänglighetspåverkan"}
          </Badge>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {journey.legs.map((leg, index) => (
          <div key={`${journey.id}-${index}`} className="flex flex-wrap items-center gap-2 text-sm">
            <TransitBadge mode={leg.mode} line={leg.line} />
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
    </Link>
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

export function Settings1({ view = "planner" }: { view?: "planner" | "departures" }) {
  const {
    profile,
    setProfile,
    hydrated,
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
  const [journeySearchMode, setJourneySearchMode] = useState<JourneySearchMode>("now");
  const [journeyDate, setJourneyDate] = useState("");
  const [journeyTime, setJourneyTime] = useState("");
  const [journeySearch, setJourneySearch] = useState<JourneySearchSelection>({
    mode: "now",
    date: "",
    time: ""
  });
  const [walkingMinutes, setWalkingMinutes] = useState(7);
  const [transferBufferMinutes, setTransferBufferMinutes] = useState(3);
  const [shareQr, setShareQr] = useState<string>();
  const [shareUrl, setShareUrl] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [addingVia, setAddingVia] = useState(false);
  const [formRestored, setFormRestored] = useState(false);
  const shouldScrollToJourneys = useRef(false);
  const lastAppliedProfileUpdate = useRef<string | null>(null);

  useEffect(() => {
    if (!hydrated || formRestored) return;

    const draft = readPlannerDraft();
    if (draft) {
      setOriginStop(draft.originStop);
      setDestinationStop(draft.destinationStop);
      setViaStops(draft.viaStops);
      setPreferredLines(draft.preferredLines);
      setAvoidedLines(draft.avoidedLines);
      setPreferredModes(draft.preferredModes);
      setRoutePreference(draft.routePreference);
      setWheelchairAccessible(draft.wheelchairAccessible);
      setJourneySearchMode(draft.journeySearchMode);
      setJourneyDate(draft.journeyDate);
      setJourneyTime(draft.journeyTime);
      setJourneySearch(draft.journeySearch);
      setWalkingMinutes(draft.walkingMinutes);
      setTransferBufferMinutes(draft.transferBufferMinutes);
    } else if (profile) {
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
    }

    lastAppliedProfileUpdate.current = profile?.updatedAt ?? null;
    setAddingVia(false);
    setFormRestored(true);
  }, [formRestored, hydrated, profile]);

  useEffect(() => {
    if (!formRestored || !profile || lastAppliedProfileUpdate.current === profile.updatedAt) return;
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
    lastAppliedProfileUpdate.current = profile.updatedAt;
  }, [formRestored, profile]);

  useEffect(() => {
    if (!formRestored) return;
    persistPlannerDraft({
      originStop,
      destinationStop,
      viaStops,
      preferredLines,
      avoidedLines,
      preferredModes,
      routePreference,
      wheelchairAccessible,
      journeySearchMode,
      journeyDate,
      journeyTime,
      journeySearch,
      walkingMinutes,
      transferBufferMinutes
    });
  }, [
    avoidedLines,
    destinationStop,
    formRestored,
    journeyDate,
    journeySearch,
    journeySearchMode,
    journeyTime,
    originStop,
    preferredLines,
    preferredModes,
    routePreference,
    transferBufferMinutes,
    viaStops,
    walkingMinutes,
    wheelchairAccessible
  ]);

  useEffect(() => {
    if (!profile || !shouldScrollToJourneys.current) return;
    shouldScrollToJourneys.current = false;
    // Wait a frame so JourneySuggestions is in the DOM after profile mounts.
    window.requestAnimationFrame(() => {
      document.getElementById("journeys-heading")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [profile]);

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

  const selectJourneySearchMode = (mode: JourneySearchMode) => {
    setJourneySearchMode(mode);
    if (mode !== "now" && (!journeyDate || !journeyTime)) {
      const scheduled = defaultScheduledTime();
      setJourneyDate(scheduled.date);
      setJourneyTime(scheduled.time);
    }
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
    if (journeySearchMode !== "now" && (!journeyDate || !journeyTime)) return;
    shouldScrollToJourneys.current = true;
    setJourneySearch({
      mode: journeySearchMode,
      date: journeySearchMode === "now" ? "" : journeyDate,
      time: journeySearchMode === "now" ? "" : journeyTime
    });
    const nextProfile = newProfile({
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
    });
    lastAppliedProfileUpdate.current = nextProfile.updatedAt;
    setProfile(nextProfile);
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
    <div className="space-y-6">
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

      <div
        id="planera"
        role="tabpanel"
        aria-labelledby="planner-tab"
        className={`${view === "departures" ? "sm:hidden " : ""}grid scroll-mt-24 items-start gap-5 xl:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]`}
      >
        {/* 1. Answer first */}
        <DecisionCard profile={profile} />

        {/* 2. Configure the trip that drives the answer */}
        <section aria-labelledby="commute-heading">
          <Card className="h-full border-0 shadow-md">
          <CardHeader className="rounded-t-lg border-b bg-muted/40 p-5">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-md bg-primary/10 text-primary">
                <Settings2 className="size-5" aria-hidden="true" />
              </div>
              <div>
                <CardTitle>
                  <h2 id="commute-heading" className="text-xl">Planera resa</h2>
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Från, till och när du vill åka.</p>
              </div>
            </div>
          </CardHeader>
          <form onSubmit={submit}>
            <CardContent className="space-y-5 p-5">
              <div className="grid gap-4 md:grid-cols-2">
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
                    storageKey="dinsl:planner-origin-search:v1"
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
                  <SearchBox
                    onSelect={setEndStation}
                    placeholder="Sök och välj slutstation"
                    storageKey="dinsl:planner-destination-search:v1"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">Hållplatsen du pendlar till.</p>
                </Field>
              </div>

              <fieldset className="space-y-3">
                <legend className="text-sm font-medium">När vill du resa?</legend>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    ["now", "Res nu"],
                    ["departure", "Åk vid"],
                    ["arrival", "Var framme vid"]
                  ] as const).map(([mode, label]) => (
                    <label key={mode} className="cursor-pointer">
                      <input
                        className="peer sr-only"
                        type="radio"
                        name="journey-search-mode"
                        value={mode}
                        checked={journeySearchMode === mode}
                        onChange={() => selectJourneySearchMode(mode)}
                      />
                      <span className="flex h-10 items-center justify-center rounded-md border border-input bg-background px-2 text-center text-sm font-medium transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2">
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
                {journeySearchMode !== "now" ? (
                  <div className="grid gap-4 rounded-md border bg-muted/30 p-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="journey-date">Dag</FieldLabel>
                      <Input
                        id="journey-date"
                        type="date"
                        required
                        value={journeyDate}
                        onChange={(event) => setJourneyDate(event.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="journey-time">
                        {journeySearchMode === "arrival" ? "Var framme vid" : "Åk vid"}
                      </FieldLabel>
                      <Input
                        id="journey-time"
                        type="time"
                        required
                        value={journeyTime}
                        onChange={(event) => setJourneyTime(event.target.value)}
                      />
                    </Field>
                  </div>
                ) : null}
              </fieldset>

              <details className="group rounded-lg border bg-muted/20">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-primary marker:hidden">
                  Fler reseval
                  <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="space-y-5 border-t p-4">
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
                    <SearchBox
                      onSelect={addViaStop}
                      placeholder="Sök och välj via-hållplats"
                      storageKey="dinsl:planner-via-search:v1"
                    />
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

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                </div>
              </details>
            </CardContent>
            <CardFooter className="justify-end border-t bg-muted/20 p-4">
              <Button className="min-w-40" type="submit" disabled={!hydrated || !originStop || !destinationStop}>
                <ArrowRight className="size-4" /> Reseförslag
              </Button>
            </CardFooter>
          </form>
        </Card>
      </section>
      </div>

      {/* 3. Journey options for the saved trip */}
      <div className={view === "departures" ? "sm:hidden" : undefined}>
        {profile ? <JourneySuggestions profile={profile} search={journeySearch} /> : null}
      </div>

      {/* 4. Discover / browse stops */}
      <section
        id="hallplatser"
        role="tabpanel"
        className={`${view === "planner" ? "sm:hidden " : ""}scroll-mt-24 space-y-3`}
        aria-labelledby="departures-tab"
      >
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
          <h2 id="stops-heading" className="text-xl font-semibold tracking-tight">
            Hitta hållplats
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sök avgångar, öppna favoriter eller hitta hållplatser nära dig.
          </p>
          </div>
          <p className="text-xs font-medium text-muted-foreground">Avgångar uppdateras i realtid</p>
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-3">
          <Card className="h-full">
          <CardHeader className="p-5">
            <CardTitle className="text-lg">Sök hållplats</CardTitle>
            <p className="text-sm text-muted-foreground">Välj en station för realtidsavgångar.</p>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <SearchBox storageKey={DEPARTURES_SEARCH_STORAGE_KEY} clearOnSelect={false} />
          </CardContent>
        </Card>

          <FavoriteStops />
          <NearbyStops />
        </div>
      </section>

      {/* 5. Secondary tools */}
      <section className={view === "planner" ? "sm:hidden" : undefined} aria-labelledby="tools-heading">
        <details className="group overflow-hidden rounded-xl border bg-card">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 marker:hidden">
            <span>
              <span id="tools-heading" className="block font-semibold">Dela och läs mer</span>
              <span className="mt-0.5 block text-sm font-normal text-muted-foreground">
                QR-kod, delningslänk och förklaring.
              </span>
            </span>
            <ChevronDown className="size-5 text-primary transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
        <div className="grid gap-4 border-t p-5 lg:grid-cols-2">
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
                Gå-nu bygger på avgångar, gångtid och marginal. Reseförslag kommer från SL:s reseplanerare utifrån dina
                trafikslag och preferenser. Tillgänglighet visar kända hiss- och anläggningsstörningar.
              </p>
            </CardContent>
          </Card>
        </div>
        </details>
      </section>
    </div>
  );
}
