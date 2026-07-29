import type { Departure } from "@/api/types";
import { formatClockTime, formatDepartureTime } from "@/lib/time";
import { Badge } from "@/components/ui/badge";
import { TransitBadge } from "@/components/TransitBadge";

export function DepartureRow({ departure }: { departure: Departure }) {
  const scheduled = formatClockTime(departure.scheduledTime);
  const expected = formatDepartureTime(departure.displayTime, departure.expectedTime);
  const normalizedStatus = departure.status?.toUpperCase();
  const statusLabel =
    normalizedStatus && !["NORMAL", "EXPECTED", "SCHEDULED"].includes(normalizedStatus)
      ? normalizedStatus === "CANCELLED"
        ? "Inställd"
        : normalizedStatus === "DELAYED"
          ? "Försenad"
          : departure.status
      : null;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_2.75rem] items-center gap-3 rounded-md bg-muted/70 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <TransitBadge
          mode={departure.mode}
          line={departure.line || "-"}
          compact
          className={departure.isCancelled ? "border-destructive bg-destructive text-destructive-foreground" : ""}
        />
        <div className="min-w-0">
          <div className="truncate font-semibold leading-tight">{departure.destination}</div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {departure.direction && departure.direction !== departure.destination ? (
              <span>Mot {departure.direction}</span>
            ) : null}
            {scheduled && scheduled !== expected ? <span>Planerad {scheduled}</span> : null}
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 text-right">
        <span className="whitespace-nowrap text-base font-bold">{expected}</span>
        {statusLabel ? (
          <Badge className="max-w-32 truncate text-[10px]" variant={departure.isCancelled ? "destructive" : "secondary"}>
            {statusLabel}
          </Badge>
        ) : null}
      </div>
      <span className="grid h-8 place-items-center rounded-md bg-background text-sm font-bold shadow-sm">
        {departure.platform || "–"}
      </span>
    </div>
  );
}
