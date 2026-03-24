import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionGuard } from "@/hooks/useSubscriptionGuard";
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
  Sparkles,
  Users,
  UsersRound,
  Package,
  Menu,
  X,
  Heart,
  MessageSquare,
  ClipboardList,
  Star,
  Gift,
  Boxes,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME, getRoleLabel } from "@/lib/utils";

type NavItem = {
  name: string;
  href?: string;
  icon: any;
  roles?: string[];
  children?: NavItem[];
};

const NAV_ITEMS: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["dono", "gerente"] },
  { 
    name: "Agenda",
    icon: CalendarDays,
    children: [
      { name: "Agenda", href: "/agenda", icon: CalendarDays },
      { name: "Horários de Pico", href: "/agenda/picos", icon: BarChart3, roles: ["dono", "gerente"] },
    ]
  },
  { 
    name: "Gestão", 
    icon: Settings,
    roles: ["dono", "gerente"],
    children: [
      { name: "Profissionais", href: "/gestao/profissionais", icon: Users },
      { name: "Serviços", href: "/gestao/servicos", icon: Heart },
      { name: "Produtos", href: "/gestao/produtos", icon: Package },
      { name: "Clientes", href: "/gestao/clientes", icon: Users },
    ]
  },
  { name: "Relatórios", href: "/relatorios", icon: BarChart3, roles: ["dono", "gerente"] },
  { name: "Caixa", href: "/caixa", icon: DollarSign, roles: ["dono", "gerente"] },
  { name: "Financeiro", href: "/financeiro", icon: TrendingUp, roles: ["dono"] },
  { name: "Pacotes", href: "/pacotes", icon: Boxes, roles: ["dono", "gerente"] },
  { name: "Lista de Espera", href: "/lista-espera", icon: ClipboardList },
  { name: "Avaliações", href: "/avaliacoes", icon: Star, roles: ["dono", "gerente"] },
  { name: "Mensagens", href: "/mensagens", icon: MessageSquare },
  { name: "Meu Estúdio", href: "/empresa", icon: Building2, roles: ["dono"] },
  { name: "Equipe", href: "/equipe", icon: UsersRound, roles: ["dono"] },
  { name: "Clube de Fidelidade", href: "/clube", icon: Award, roles: ["dono", "gerente"] },
];

function filterNavByRole(items: NavItem[], role: string): NavItem[] {
  return items.reduce<NavItem[]>((acc, item) => {
    if (item.roles && !item.roles.includes(role)) return acc;
    if (item.children) {
      const filteredChildren = item.children.filter(
        child => !child.roles || child.roles.includes(role)
      );
      if (filteredChildren.length > 0) {
        acc.push({ ...item, children: filteredChildren });
      }
    } else {
      acc.push(item);
    }
    return acc;
  }, []);
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout, isLoading, barbeariaId, role } = useAuth();
  const { canAccess, status, shouldShowUpgrade } = useSubscriptionGuard();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    if (!isLoading) {
      if (!user) {
        window.location.href = "/login";
      } else if (role === "dono" && !barbeariaId && !location.startsWith("/onboarding")) {
        window.location.href = "/onboarding/barbearia";
      }
    }
  }, [user, isLoading, barbeariaId, location, role]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#fafafa]"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div></div>;
  }

  if (!user) return null;

  if (!canAccess && status !== "none") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] p-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="h-16 w-16 rounded-2xl bg-red-500/8 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <div>
            <h1 className="text-[22px] font-bold text-foreground mb-2">
              Assinatura {status === "cancelado" ? "Cancelada" : "Inativa"}
            </h1>
            <p className="text-foreground/45 text-[14px] leading-relaxed">
              {status === "cancelado"
                ? "Sua assinatura foi cancelada. Renove seu plano para continuar usando a plataforma."
                : "Sua assinatura está inativa. Atualize seu plano para voltar a usar todas as funcionalidades."}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Link href="/#precos">
              <Button size="lg" className="w-full rounded-xl h-11 text-[14px] font-medium">Ver Planos</Button>
            </Link>
            <Button size="lg" variant="outline" onClick={logout} className="rounded-xl h-11 text-[14px]">Sair</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#fafafa]">
      <div className="md:hidden flex items-center justify-between px-5 py-3 border-b border-black/[0.04] bg-white">
        <div className="flex items-center gap-2 font-semibold text-[15px] text-foreground tracking-tight">
          <Sparkles className="h-[18px] w-[18px] text-primary" /> {APP_NAME}
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="h-8 w-8">
          {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-[240px] bg-white border-r border-black/[0.04] transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="px-5 py-5 hidden md:flex items-center gap-2.5 font-semibold text-[15px] text-foreground tracking-tight">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          {APP_NAME}
        </div>

        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {filterNavByRole(NAV_ITEMS, role).map((item) => (
            <div key={item.name}>
              {item.href ? (
                <Link href={item.href} className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150",
                  location === item.href || location.startsWith(item.href + '/')
                    ? "bg-foreground text-white" 
                    : "text-foreground/50 hover:text-foreground hover:bg-black/[0.03]"
                )} onClick={() => setMobileMenuOpen(false)}>
                  <item.icon className="h-[16px] w-[16px]" />
                  {item.name}
                </Link>
              ) : (
                <div className="mt-5 mb-1">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-foreground/30 uppercase tracking-wider">
                    {item.name}
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {item.children?.map(child => (
                      <Link key={child.name} href={child.href} className={cn(
                        "flex items-center gap-2.5 px-3 py-2 ml-1 rounded-lg text-[13px] font-medium transition-all duration-150",
                        location === child.href 
                          ? "bg-primary/8 text-primary" 
                          : "text-foreground/50 hover:text-foreground hover:bg-black/[0.03]"
                      )} onClick={() => setMobileMenuOpen(false)}>
                        <child.icon className="h-[15px] w-[15px]" />
                        {child.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-black/[0.04]">
          <div className="flex items-center gap-2.5 px-2 py-2 mb-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-semibold text-[12px]">
              {user.nome.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-foreground truncate">{user.nome}</p>
              <p className="text-[11px] text-foreground/35 truncate capitalize">{getRoleLabel(user.role)}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-foreground/40 hover:text-red-500 hover:bg-red-50 text-[13px] h-8 rounded-lg" 
            onClick={logout}
          >
            <LogOut className="mr-2 h-3.5 w-3.5" /> Sair
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-h-screen overflow-hidden relative">
        {shouldShowUpgrade && (
          <div className="bg-primary/5 border-b border-primary/10 px-4 py-2 flex items-center justify-center gap-3 z-20">
            <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-[13px] text-foreground/60">Período de teste gratuito ativo.</span>
            <Link href="/#precos">
              <Button size="sm" variant="outline" className="border-primary/20 text-primary text-[11px] h-6 px-2.5 rounded-full">
                Escolher Plano
              </Button>
            </Link>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-5 md:p-8 z-10">
          {children}
        </div>
      </main>
      
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}
    </div>
  );
}
