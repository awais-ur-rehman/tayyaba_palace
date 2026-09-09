import { CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Invoice } from "@/lib/bookings";

export function FiscalBadge({ invoice }: { invoice: Invoice | null }) {
  if (!invoice) return <Badge variant="outline">—</Badge>;

  if (invoice.status === "FISCALIZED") {
    return (
      <Badge variant="success">
        <CheckCircle2 className="h-3 w-3" /> Done
      </Badge>
    );
  }
  if (invoice.status === "FAILED") {
    return (
      <Badge variant="destructive" title={invoice.lastError ?? undefined}>
        <AlertCircle className="h-3 w-3" /> Failed
      </Badge>
    );
  }
  return (
    <Badge variant="warning" title={invoice.lastError ?? undefined}>
      <Clock className="h-3 w-3" /> Pending
    </Badge>
  );
}
