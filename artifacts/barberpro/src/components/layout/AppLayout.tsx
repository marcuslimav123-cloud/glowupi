import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  CalendarDays, 
  Settings, 
  BarChart3, 
  DollarSign, 
  TrendingUp, 
  Building2, 
  Award,
  LogOut,
  Scissors,
  Users,
  Package,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { 
    name: "Agenda",
    icon: CalendarDays,
    children: [
      { name: "Agenda", href: "/agenda", icon: CalendarDays },
      { name: "Horários de Pico", href: "/agenda/picos", icon: BarChart3 },
    ]
  },
  { 
    name: "Gestão", 
    icon: Settings,
    children: [
      { name: "Profissionais", href: "/gestao/profissionais", icon: Users },
      { name: "Serviços", href: "/gestao/servicos", icon: Scissors },
      { name: "Produtos", href: "/gestao/produtos", icon: Package },
    ]
  },
  { name: "Relatórios", href: "/relatorios", icon: BarChart3 },
  { name: "Caixa", href: "/caixa", icon: DollarSign },
  { name: "Financeiro", href: "/financeiro", icon: TrendingUp },
  { name: "Minha Empresa", href: "/empresa", icon: Building2 },
  { name: "Clube do Assinante", href: "/clube", icon: Award },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout, isLoading, barbeariaId } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Redirect logic
  React.useEffect(() => {
    if (!isLoading) {
      if (!user) {
        window.location.href = "/login";
      } else if (!barbeariaId && !location.startsWith("/onboarding")) {
        window.location.href = "/onboarding/barbearia";
      }
    }
  }, [user, isLoading, barbeariaId, location]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div></div>;
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-2 text-primary font-display font-bold text-xl">
          <Scissors className="h-6 w-6" /> BarberPro
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 hidden md:flex items-center gap-3 text-primary font-display font-bold text-2xl tracking-wider">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <Scissors className="h-6 w-6 text-primary" />
          </div>
          BARBERPRO
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <div key={item.name}>
              {item.href ? (
                <Link href={item.href} className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  location === item.href || location.startsWith(item.href + '/')
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                    : "text-muted-foreground hover:text-foreground hover:bg-card hover:shadow-sm"
                )} onClick={() => setMobileMenuOpen(false)}>
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              ) : (
                <div className="mt-4 mb-1">
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {item.name}
                  </div>
                  <div className="space-y-1 mt-1">
                    {item.children?.map(child => (
                      <Link key={child.name} href={child.href} className={cn(
                        "flex items-center gap-3 px-3 py-2.5 ml-2 rounded-xl text-sm font-medium transition-all duration-200",
                        location === child.href 
                          ? "bg-primary/10 text-primary border border-primary/20" 
                          : "text-muted-foreground hover:text-foreground hover:bg-card"
                      )} onClick={() => setMobileMenuOpen(false)}>
                        <child.icon className="h-4 w-4" />
                        {child.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-4">
            <div className="h-10 w-10 rounded-full bg-card border border-border flex items-center justify-center text-primary font-bold">
              {user.nome.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user.nome}</p>
              <p className="text-xs text-muted-foreground truncate capitalize">{user.role}</p>
            </div>
          </div>
          <Button variant="outline" className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" /> Sair do sistema
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('/images/hero-bg.png')] bg-cover bg-center opacity-5 pointer-events-none mix-blend-screen" />
        <div className="flex-1 overflow-y-auto p-4 md:p-8 z-10">
          {children}
        </div>
      </main>
      
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}
    </div>
  );
}
