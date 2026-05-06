import { Badge } from "./badge";
import { placementStatusVisual, type PlacementStatus } from "@/lib/finance/status";

export function PlacementStatusBadge({ status }: { status: PlacementStatus }) {
  const v = placementStatusVisual[status];
  return (
    <Badge tone={v.tone} dot>
      {v.label}
    </Badge>
  );
}
