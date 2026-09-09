import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSettings, useUpdateSettings } from "@/lib/settings";
import { useToast } from "@/components/toast";
import { apiPost } from "@/lib/api";
import { cn } from "@/lib/utils";

export function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const { data: settings } = useSettings();
  const update = useUpdateSettings();
  const { toast } = useToast();

  const [form, setForm] = useState({
    businessName: "",
    businessAddress: "",
    businessPhone: "",
    pntn: "",
    posId: "",
    fiscalMode: "SANDBOX" as "SANDBOX" | "PRODUCTION",
    defaultPctCode: "",
    defaultTaxRate: 0,
    usinPrefix: "TP-",
    printerInterface: "",
    receiptFooter: "",
  });

  useEffect(() => {
    if (!settings) return;
    setForm({
      businessName: settings.businessName ?? "",
      businessAddress: settings.businessAddress ?? "",
      businessPhone: settings.businessPhone ?? "",
      pntn: settings.pntn ?? "",
      posId: settings.posId ?? "",
      fiscalMode: settings.fiscalMode,
      defaultPctCode: settings.defaultPctCode ?? "",
      defaultTaxRate: settings.defaultTaxRate,
      usinPrefix: settings.usinPrefix,
      printerInterface: settings.printerInterface ?? "",
      receiptFooter: settings.receiptFooter ?? "",
    });
  }, [settings]);

  async function onSave() {
    try {
      await update.mutateAsync(form);
      toast("Settings saved.");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save settings.", "error");
    }
  }

  async function onTestPrint() {
    try {
      await apiPost("/printer/test");
      toast("Test print sent.");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Test print failed.", "error");
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between p-5 text-left cursor-pointer"
      >
        <h2 className="font-heading text-lg text-foreground">Settings</h2>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="space-y-6 border-t border-border p-5">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Business name">
              <Input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
            </FormField>
            <FormField label="Phone">
              <Input value={form.businessPhone} onChange={(e) => setForm({ ...form, businessPhone: e.target.value })} />
            </FormField>
            <FormField label="Address">
              <Input value={form.businessAddress} onChange={(e) => setForm({ ...form, businessAddress: e.target.value })} />
            </FormField>
            <FormField label="PNTN">
              <Input value={form.pntn} onChange={(e) => setForm({ ...form, pntn: e.target.value })} />
            </FormField>
            <FormField label="POS ID">
              <Input value={form.posId} onChange={(e) => setForm({ ...form, posId: e.target.value })} />
            </FormField>
            <FormField label="Fiscal mode">
              <Select
                value={form.fiscalMode}
                onValueChange={(v) => setForm({ ...form, fiscalMode: v as "SANDBOX" | "PRODUCTION" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SANDBOX">Sandbox</SelectItem>
                  <SelectItem value="PRODUCTION">Production</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Default PCT code">
              <Input
                value={form.defaultPctCode}
                maxLength={8}
                onChange={(e) => setForm({ ...form, defaultPctCode: e.target.value.slice(0, 8) })}
              />
            </FormField>
            <FormField label="Default tax rate (%)">
              <Input
                type="number"
                value={form.defaultTaxRate || ""}
                onChange={(e) => setForm({ ...form, defaultTaxRate: Number(e.target.value) || 0 })}
              />
            </FormField>
            <FormField label="USIN prefix">
              <Input value={form.usinPrefix} disabled />
            </FormField>
            <FormField label="Printer interface">
              <Input
                value={form.printerInterface}
                onChange={(e) => setForm({ ...form, printerInterface: e.target.value })}
                placeholder="printer:POS-80"
              />
            </FormField>
          </div>
          <FormField label="Receipt footer">
            <Input value={form.receiptFooter} onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })} />
          </FormField>

          {form.fiscalMode !== settings?.fiscalMode || form.posId !== settings?.posId ? (
            <p className="rounded-md bg-warning/10 p-3 text-sm text-warning-foreground">
              Changing fiscal mode or POS ID requires the PRA component to be reinstalled to match — a mismatch
              means every invoice fails.
            </p>
          ) : null}

          <div className="flex justify-between">
            <Button variant="outline" onClick={onTestPrint}>
              Test Print
            </Button>
            <Button onClick={onSave} disabled={update.isPending}>
              {update.isPending ? "Saving…" : "Save settings"}
            </Button>
          </div>

          <ChangePassword />
        </div>
      )}
    </section>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ChangePassword() {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await apiPost("/auth/change-password", { currentPassword, newPassword });
      toast("Password changed.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="border-t border-border pt-6">
      <h3 className="mb-3 text-sm font-semibold text-foreground">Change password</h3>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Current password">
          <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
        </FormField>
        <FormField label="New password">
          <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </FormField>
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      <div className="mt-3 flex justify-end">
        <Button
          variant="outline"
          onClick={onSubmit}
          disabled={submitting || !currentPassword || newPassword.length < 8}
        >
          Change password
        </Button>
      </div>
    </div>
  );
}
