import { NavLink, useNavigate } from "react-router-dom";
import { CalendarRange, Package, Settings2, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useHealth } from "@/lib/use-health";
import { StatusDot } from "./status-dot";

const NAV_ITEMS = [
  { to: "/bookings", label: "Bookings", icon: CalendarRange },
  { to: "/inventory", label: "Inventory", icon: Package },
  { to: "/system", label: "System", icon: Settings2 },
];

export function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { data: health } = useHealth();

  const fiscalTone = !health ? "amber" : !health.fiscal ? "red" : health.pendingInvoices > 0 ? "amber" : "green";
  const printerTone = !health ? "amber" : health.printer ? "green" : "red";

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="px-5 pb-4 pt-6">
        <h1 className="font-heading text-xl leading-tight text-sidebar-foreground">Tayyaba Palace</h1>
        <p className="mt-0.5 text-[11px] uppercase tracking-wider text-sidebar-muted">Front Desk</p>
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-active text-white"
                  : "text-sidebar-muted hover:bg-white/5 hover:text-sidebar-foreground"
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-1 border-t border-white/10 px-3 py-3">
        <StatusDot
          tone={fiscalTone}
          label="Fiscal"
          detail={health && health.pendingInvoices > 0 ? String(health.pendingInvoices) : undefined}
          onClick={() => navigate("/system")}
        />
        <StatusDot tone={printerTone} label="Printer" />
      </div>

      <div className="border-t border-white/10 px-3 py-3">
        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-muted hover:bg-white/5 hover:text-sidebar-foreground cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
