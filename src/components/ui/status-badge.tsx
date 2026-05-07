import { Badge } from "./badge";
import {
  investmentStatusVisual,
  placementStatusVisual,
  type InvestmentStatus,
  type PlacementStatus,
} from "@/lib/finance/status";

export function PlacementStatusBadge({ status }: { status: PlacementStatus }) {
  const v = placementStatusVisual[status];
  return (
    <Badge tone={v.tone} dot>
      {v.label}
    </Badge>
  );
}

export function InvestmentStatusBadge({ status }: { status: InvestmentStatus }) {
  const v = investmentStatusVisual[status];
  return (
    <Badge tone={v.tone} dot>
      {v.label}
    </Badge>
  );
}
