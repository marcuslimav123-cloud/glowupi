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
      <div className="flex items-center justify-around h-16 px-1">
        {TABS.map((tab) => {
          const isActive =
            loc === tab.href ||
            loc.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all duration-200 rounded-xl mx-0.5",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground active:scale-95"
              )}
            >
              <div className={cn(
                "flex items-center justify-center h-7 w-7 rounded-lg transition-all duration-200",
                isActive && "bg-primary/10"
              )}>
                <tab.icon className={cn("h-[20px] w-[20px]", isActive && "stroke-[2.5]")} />
              </div>
              <span className={cn(
                "text-[11px] leading-none",
                isActive ? "font-bold" : "font-medium"
              )}>
                {tab.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
