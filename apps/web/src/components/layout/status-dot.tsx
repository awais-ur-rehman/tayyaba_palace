import { cn } from "@/lib/utils";

type Tone = "green" | "amber" | "red";

export function StatusDot({
  tone,
  label,
  detail,
  onClick,
}: {
  tone: Tone;
  label: string;
  detail?: string;
  onClick?: () => void;
}) {
  const dotColor = tone === "green" ? "bg-success" : tone === "amber" ? "bg-warning" : "bg-destructive";
  const Comp = onClick ? "button" : "div";

  return (
    <Comp
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs text-sidebar-muted",
        onClick && "cursor-pointer hover:bg-white/5"
      )}
    >
      <span className={cn("h-2 w-2 shrink-0 rounded-full", dotColor)} />
      <span className="flex-1">{label}</span>
      {detail && (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
            tone === "amber" ? "bg-warning text-warning-foreground" : "bg-white/10 text-sidebar-foreground"
          )}
        >
          {detail}
        </span>
      )}
    </Comp>
  );
}
