import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "warning" | "error";

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
  action?: { label: string; onClick: () => void };
}

interface ToastContextValue {
  toast: (message: string, tone?: ToastTone, action?: Toast["action"]) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_STYLES: Record<ToastTone, string> = {
  success: "border-success/30 bg-white text-foreground",
  warning: "border-warning/40 bg-white text-foreground",
  error: "border-destructive/40 bg-white text-foreground",
};

const TONE_ICON: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />,
  warning: <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />,
  error: <XCircle className="h-5 w-5 shrink-0 text-destructive" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, tone: ToastTone = "success", action?: Toast["action"]) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone, action }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex items-start gap-3 rounded-md border p-4 shadow-lg animate-in slide-in-from-bottom-2 fade-in",
              TONE_STYLES[t.tone]
            )}
          >
            {TONE_ICON[t.tone]}
            <div className="flex-1 text-sm">{t.message}</div>
            {t.action && (
              <button
                onClick={t.action.onClick}
                className="shrink-0 text-sm font-semibold text-primary hover:underline cursor-pointer"
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
