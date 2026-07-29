import {
  BusFront,
  Footprints,
  Route,
  Ship,
  TrainFront,
  TrainFrontTunnel,
  TramFront,
  type LucideIcon
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getTransitAppearance, type TransitKind } from "@/lib/transit";
import { cn } from "@/lib/utils";

const MODE_ICONS: Record<TransitKind, LucideIcon> = {
  walk: Footprints,
  metro: TrainFrontTunnel,
  train: TrainFront,
  tram: TramFront,
  bus: BusFront,
  ship: Ship,
  other: Route
};

export function TransitBadge({
  mode,
  line,
  compact = false,
  className
}: {
  mode?: string;
  line?: string;
  compact?: boolean;
  className?: string;
}) {
  const appearance = getTransitAppearance(mode, line);
  const Icon = MODE_ICONS[appearance.kind];

  return (
    <Badge
      variant="outline"
      className={cn("h-6 gap-1.5 border px-2 font-semibold shadow-sm", className)}
      style={{
        backgroundColor: appearance.backgroundColor,
        borderColor: appearance.borderColor,
        color: appearance.foregroundColor
      }}
      data-transit-mode={appearance.kind}
      data-transit-line={line}
      aria-label={appearance.label}
    >
      <Icon className="size-3.5 shrink-0" strokeWidth={2.25} aria-hidden="true" />
      <span>{compact && line ? line : appearance.label}</span>
    </Badge>
  );
}
