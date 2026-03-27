import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  DollarSign,
  Menu,
} from "lucide-react";

const TABS = [
  { name: "Início", href: "/dashboard", icon: LayoutDashboard },
  { name: "Agenda", href: "/agenda", icon: CalendarDays },
  { name: "Clientes", href: "/gestao/clientes", icon: Users },
  { name: "Caixa", href: "/financeiro/caixa", icon: DollarSign },
  { name: "Menu", href: "/menu", icon: Menu },
];

export function MobileBottomBar() {
  const [location] = useLocation();
  const loc = location.split("?")[0];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {TABS.map((tab) => {
          const isActive =
            loc === tab.href ||
            loc.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <tab.icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
              <span className={cn("text-[10px] font-medium", isActive && "font-semibold")}>
                {tab.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
