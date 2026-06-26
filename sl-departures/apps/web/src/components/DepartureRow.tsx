import type { Departure } from "@/api/types";
import { formatClockTime, formatDepartureTime } from "@/lib/time";
import { Badge } from "@/components/ui/badge";

export function DepartureRow({ departure }: { departure: Departure }) {
  const scheduled = formatClockTime(departure.scheduledTime);
  const expected = formatDepartureTime(departure.displayTime, departure.expectedTime);

  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md border bg-card p-3">
      <Badge variant={departure.isCancelled ? "destructive" : "default"}>{departure.line || "-"}</Badge>
      <div className="min-w-0">
        <div className="truncate font-medium">{departure.destination}</div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {departure.direction ? <span>Mot {departure.direction}</span> : null}
          {departure.platform ? <span>Läge {departure.platform}</span> : null}
          {scheduled && scheduled !== expected ? <span>Planerad {scheduled}</span> : null}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="text-sm font-semibold">{expected}</span>
        {departure.status && departure.status !== "NORMAL" ? (
          <Badge className="max-w-44 truncate" variant={departure.isCancelled ? "destructive" : "secondary"}>
            {departure.status}
          </Badge>
        ) : null}
      </div>
    </div>
  );
}
