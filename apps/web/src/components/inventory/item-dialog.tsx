import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCreateInventoryItem, useUpdateInventoryItem, type InventoryItem } from "@/lib/inventory";
import { useSettings } from "@/lib/settings";
import { useToast } from "@/components/toast";
import { unitForCategory, type Category } from "@tayyaba/shared";
import { formatMoney } from "@/lib/utils";

const UNIT_LABEL = { PER_HEAD: "per head", PER_HOUR: "per hour" };

export function ItemDialog({
  open,
  onOpenChange,
  category,
  editing,
  existingCodes,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  category: Category;
  editing: InventoryItem | null;
  existingCodes: string[];
}) {
  const { data: settings } = useSettings();
  const create = useCreateInventoryItem();
  const update = useUpdateInventoryItem();
  const { toast } = useToast();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [defaultPrice, setDefaultPrice] = useState(0); // rupees display
  const [pctCode, setPctCode] = useState("");
  const [taxRate, setTaxRate] = useState(0);
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Recompute defaults only on the open transition, not on every parent
  // re-render — existingCodes/settings are fresh references each render, and
  // depending on them here would reset user input mid-typing on a background
  // query refetch.
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setCode(editing.code);
      setName(editing.name);
      setDefaultPrice(editing.defaultPrice / 100);
      setPctCode(editing.pctCode);
      setTaxRate(editing.taxRate);
      setActive(!!editing.active);
    } else {
      const prefix = category.slice(0, 4);
      const n = existingCodes.filter((c) => c.startsWith(prefix)).length + 1;
      setCode(`${prefix}-${String(n).padStart(3, "0")}`);
      setName("");
      setDefaultPrice(0);
      setPctCode(settings?.defaultPctCode ?? "");
      setTaxRate(settings?.defaultTaxRate ?? 0);
      setActive(true);
    }
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit() {
    setError(null);
    if (!name.trim()) return setError("Name is required.");
    if (pctCode.length !== 8) return setError("PCT code must be 8 characters.");

    const input = {
      code,
      category,
      name,
      defaultPrice: Math.round(defaultPrice * 100),
      pctCode,
      taxRate,
      active,
    };

    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, ...input });
        toast("Item updated.");
      } else {
        await create.mutateAsync(input);
        toast("Item added.");
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save item.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit item" : "Add item"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Code *</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Unit</Label>
            <Input value={UNIT_LABEL[unitForCategory(category)]} disabled />
          </div>
          <div className="space-y-1.5">
            <Label>Default price (Rs.) *</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={defaultPrice || ""}
              onChange={(e) => setDefaultPrice(Number(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground">{formatMoney(Math.round(defaultPrice * 100))} PKR</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>PCT code *</Label>
              <Input value={pctCode} onChange={(e) => setPctCode(e.target.value.slice(0, 8))} maxLength={8} />
            </div>
            <div className="space-y-1.5">
              <Label>Tax rate (%) *</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={taxRate || ""}
                onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="active-toggle">Active</Label>
            <Switch id="active-toggle" checked={active} onCheckedChange={setActive} />
          </div>

          {editing && (
            <p className="text-xs text-muted-foreground">
              Changing the price does not affect existing bookings.
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={create.isPending || update.isPending}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
