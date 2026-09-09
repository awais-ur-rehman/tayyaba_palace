import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInventory } from "@/lib/inventory";
import { useCreateBooking } from "@/lib/bookings";
import { useToast } from "@/components/toast";
import { ApiError } from "@/lib/api";
import { formatMoney } from "@/lib/utils";
import { CATEGORIES, PAYMENT_MODES, type Category, type PaymentMode } from "@tayyaba/shared";
import type { InventoryItem } from "@/lib/inventory";

interface LineState {
  key: string;
  itemId: string;
  quantity: number;
  unitPrice: number; // paisa
  manuallyEdited: boolean;
}

const CATEGORY_LABEL: Record<Category, string> = { FOOD: "Food", SITTING: "Sitting", SERVICE: "Services" };

function taxOn(saleValue: number, rate: number) {
  return Math.round((saleValue * rate) / 100);
}

export function BookingCreatePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: items = [] } = useInventory({ active: true });
  const createBooking = useCreateBooking();

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientCnic, setClientCnic] = useState("");
  const [clientPntn, setClientPntn] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("19:00");
  const [guestCount, setGuestCount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<number>(1);
  const [notes, setNotes] = useState("");
  const [linesByCategory, setLinesByCategory] = useState<Record<Category, LineState[]>>({
    FOOD: [],
    SITTING: [],
    SERVICE: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const itemsByCategory = useMemo(() => {
    const map: Record<Category, InventoryItem[]> = { FOOD: [], SITTING: [], SERVICE: [] };
    for (const item of items) map[item.category].push(item);
    return map;
  }, [items]);

  // Guests changing re-drives quantity on per-head lines the user hasn't manually touched.
  useEffect(() => {
    setLinesByCategory((prev) => {
      const next = { ...prev };
      for (const cat of CATEGORIES) {
        next[cat] = prev[cat].map((line) => {
          const item = itemsById.get(line.itemId);
          if (item?.unit === "PER_HEAD" && !line.manuallyEdited) {
            return { ...line, quantity: guestCount };
          }
          return line;
        });
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guestCount]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void onSubmit();
      }
      if (e.key === "Escape") navigate("/bookings");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  function addLine(category: Category) {
    const firstItem = itemsByCategory[category][0];
    if (!firstItem) return;
    const line: LineState = {
      key: crypto.randomUUID(),
      itemId: firstItem.id,
      quantity: firstItem.unit === "PER_HEAD" ? guestCount : 1,
      unitPrice: firstItem.defaultPrice,
      manuallyEdited: false,
    };
    setLinesByCategory((prev) => ({ ...prev, [category]: [...prev[category], line] }));
  }

  function removeLine(category: Category, key: string) {
    setLinesByCategory((prev) => ({ ...prev, [category]: prev[category].filter((l) => l.key !== key) }));
  }

  function updateLine(category: Category, key: string, patch: Partial<LineState>) {
    setLinesByCategory((prev) => ({
      ...prev,
      [category]: prev[category].map((l) => (l.key === key ? { ...l, ...patch } : l)),
    }));
  }

  function selectItem(category: Category, key: string, itemId: string) {
    const item = itemsById.get(itemId);
    if (!item) return;
    updateLine(category, key, {
      itemId,
      unitPrice: item.defaultPrice,
      quantity: item.unit === "PER_HEAD" ? guestCount : 1,
      manuallyEdited: false,
    });
  }

  const allLines = CATEGORIES.flatMap((cat) => linesByCategory[cat]);
  const computed = allLines.map((l) => {
    const item = itemsById.get(l.itemId);
    const saleValue = Math.round(l.unitPrice * l.quantity);
    const taxCharged = item ? taxOn(saleValue, item.taxRate) : 0;
    return { ...l, item, saleValue, taxCharged, total: saleValue + taxCharged };
  });
  const totalSale = computed.reduce((s, l) => s + l.saleValue, 0);
  const totalTax = computed.reduce((s, l) => s + l.taxCharged, 0);
  const grandTotal = totalSale + totalTax;
  const uniformRate = computed.length > 0 && computed.every((l) => l.item?.taxRate === computed[0].item?.taxRate);

  async function onSubmit() {
    setFieldErrors({});
    if (allLines.length === 0) {
      toast("Add at least one line before saving.", "error");
      return;
    }
    if (!clientName.trim()) {
      setFieldErrors({ clientName: "Client name is required." });
      return;
    }
    if (!eventDate) {
      setFieldErrors({ eventDate: "Event date is required." });
      return;
    }
    if (guestCount < 1) {
      setFieldErrors({ guestCount: "Guests must be at least 1." });
      return;
    }

    setSubmitting(true);
    try {
      const result = await createBooking.mutateAsync({
        clientName,
        clientPhone,
        clientCnic,
        clientPntn,
        eventDate,
        eventTime,
        guestCount,
        paymentMode,
        notes,
        lines: allLines.map((l) => ({
          itemId: l.itemId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          manuallyEdited: l.manuallyEdited,
        })),
      });

      if (result.invoiceStatus === "FISCALIZED" && result.printOk) {
        toast("Booking saved. Receipt printed.", "success");
      } else if (result.invoiceStatus !== "FISCALIZED" && result.printOk) {
        toast(
          "Booking saved. Fiscal number pending — provisional receipt printed. It will sync automatically.",
          "warning"
        );
      } else if (result.invoiceStatus === "FISCALIZED" && !result.printOk) {
        toast("Booking saved and fiscalised. Printing failed — check the printer, then reprint.", "warning");
      } else {
        toast("Booking saved. Fiscal number and printing both pending.", "warning");
      }

      navigate("/bookings");
    } catch (err) {
      toast(
        err instanceof ApiError ? err.message : "Could not save the booking. Nothing was charged.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pb-24">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">New Booking</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/bookings")}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? "Saving…" : "Save & Print"}
          </Button>
        </div>
      </div>

      <section className="mt-6 rounded-lg border border-border bg-card p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Client</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name" required error={fieldErrors.clientName}>
            <Input value={clientName} onChange={(e) => setClientName(e.target.value)} autoFocus />
          </Field>
          <Field label="Phone">
            <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
          </Field>
          <Field label="CNIC" hint="13 digits">
            <Input
              value={clientCnic}
              onChange={(e) => setClientCnic(e.target.value.replace(/\D/g, "").slice(0, 13))}
              maxLength={13}
            />
          </Field>
          <Field label="PNTN" hint="optional, for businesses">
            <Input value={clientPntn} onChange={(e) => setClientPntn(e.target.value)} placeholder="1234567-8" />
          </Field>
        </div>
      </section>

      <section className="mt-4 rounded-lg border border-border bg-card p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Event</h2>
        <div className="grid grid-cols-4 gap-4">
          <Field label="Date" required error={fieldErrors.eventDate}>
            <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </Field>
          <Field label="Time">
            <Input type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} />
          </Field>
          <Field label="Guests" required error={fieldErrors.guestCount}>
            <Input
              type="number"
              min={1}
              value={guestCount || ""}
              onChange={(e) => setGuestCount(Number(e.target.value) || 0)}
            />
          </Field>
          <Field label="Payment mode" required>
            <Select value={String(paymentMode)} onValueChange={(v) => setPaymentMode(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PAYMENT_MODES).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </section>

      <section className="mt-4 rounded-lg border border-border bg-card p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bill</h2>

        {CATEGORIES.map((category) => (
          <div key={category} className="mb-6 last:mb-0">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">{CATEGORY_LABEL[category]}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addLine(category)}
                disabled={itemsByCategory[category].length === 0}
              >
                <Plus className="h-3.5 w-3.5" /> Add item
              </Button>
            </div>

            {itemsByCategory[category].length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No items in {CATEGORY_LABEL[category]} yet. Add one in Inventory before creating a booking.
              </p>
            ) : linesByCategory[category].length === 0 ? (
              <p className="text-sm text-muted-foreground">No items added.</p>
            ) : (
              <div className="space-y-2">
                {linesByCategory[category].map((line) => {
                  const item = itemsById.get(line.itemId);
                  const saleValue = Math.round(line.unitPrice * line.quantity);
                  const isPerHead = item?.unit === "PER_HEAD";
                  return (
                    <div key={line.key} className="grid grid-cols-[1fr_100px_120px_120px_32px] items-center gap-2">
                      <Select value={line.itemId} onValueChange={(v) => selectItem(category, line.key, v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {itemsByCategory[category].map((i) => (
                            <SelectItem key={i.id} value={i.id}>
                              {i.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div>
                        <Input
                          type="number"
                          min={0}
                          value={line.quantity || ""}
                          onChange={(e) =>
                            updateLine(category, line.key, {
                              quantity: Number(e.target.value) || 0,
                              manuallyEdited: true,
                            })
                          }
                        />
                        {isPerHead && line.manuallyEdited && (
                          <span className="mt-0.5 block text-[10px] text-muted-foreground">edited</span>
                        )}
                      </div>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.unitPrice / 100}
                        onChange={(e) =>
                          updateLine(category, line.key, {
                            unitPrice: Math.round(Number(e.target.value) * 100) || 0,
                          })
                        }
                      />
                      <p className="text-right text-sm tabular-nums">{formatMoney(saleValue)}</p>
                      <button
                        onClick={() => removeLine(category, line.key)}
                        className="flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-destructive cursor-pointer"
                        aria-label="Remove line"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        <div className="mt-4 space-y-1 border-t border-border pt-4">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Sale value</span>
            <span className="tabular-nums">{formatMoney(totalSale)}</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{uniformRate && computed[0]?.item ? `Sales tax (${computed[0].item.taxRate}%)` : "Sales tax"}</span>
            <span className="tabular-nums">{formatMoney(totalTax)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold text-foreground">
            <span>TOTAL</span>
            <span className="tabular-nums">{formatMoney(grandTotal)}</span>
          </div>
        </div>
      </section>

      <section className="mt-4">
        <Field label="Notes">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </section>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
