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
  AlertTriangle,
  Tag,
  Ticket,
  Newspaper,
  Bell,
  Crown,
  ShoppingCart,
  ChevronDown,
  ChevronRight,
  Shield,
  Mail,
  Receipt,
  History,
  ArrowUpDown,
  Percent,
  Wallet,
  FileText,
  Clock,
  ShieldAlert,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME, getRoleLabel } from "@/lib/utils";
import { HeaderBar, applyTheme } from "./HeaderBar";

type NavItem = {
  name: string;
  href?: string;
  icon: any;
  roles?: string[];
  children?: NavItem[];
  subgroups?: { label: string; items: NavItem[] }[];
};

const NAV_ITEMS: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { 
    name: "Agenda",
    href: "/agenda",
    icon: CalendarDays,
  },
  { 
    name: "Cadastros", 
    icon: Settings,
    roles: ["dono", "gerente"],
    children: [
      { name: "Clientes", href: "/gestao/clientes", icon: Users },
      { name: "Profissionais", href: "/gestao/profissionais", icon: Users },
      { name: "Serviços", href: "/gestao/servicos", icon: Heart },
    ],
    subgroups: [
      {
        label: "Pacotes",
        items: [
          { name: "Meus Pacotes", href: "/pacotes", icon: Boxes },
          { name: "Venda de Pacotes", href: "/pacotes/vendas", icon: ShoppingCart },
        ],
      },
      {
        label: "Tipos",
        items: [
          { name: "Cat. Serviço", href: "/cadastros/tipos", icon: Tag },
          { name: "Cat. Profissional", href: "/cadastros/tipos?cat=profissional", icon: Tag },
          { name: "Cat. Produto", href: "/cadastros/tipos?cat=produto", icon: Tag },
          { name: "Tipo Pagamentos", href: "/cadastros/tipos?cat=pagamento", icon: CreditCardIcon },
          { name: "Despesas", href: "/cadastros/tipos?cat=despesa", icon: TrendingUp },
          { name: "Receitas", href: "/cadastros/tipos?cat=receita", icon: DollarSign },
          { name: "Subcontas", href: "/cadastros/tipos?cat=subconta", icon: ClipboardList },
          { name: "Equipamentos", href: "/cadastros/tipos?cat=equipamento", icon: Settings },
          { name: "Fornecedores", href: "/cadastros/tipos?cat=fornecedor", icon: Package },
          { name: "Tipo Anamnese", href: "/cadastros/tipos?cat=anamnese", icon: FileText },
          { name: "Bandeiras", href: "/cadastros/tipos?cat=bandeira", icon: Tag },
          { name: "Remunerações", href: "/cadastros/tipos?cat=remuneracao", icon: DollarSign },
          { name: "Deduções", href: "/cadastros/tipos?cat=deducao", icon: Percent },
        ],
      },
      {
        label: "Comunicação",
        items: [
          { name: "Mensagens", href: "/mensagens", icon: MessageSquare },
          { name: "Notícias", href: "/cadastros/noticias", icon: Newspaper },
          { name: "Grupos de Clientes", href: "/cadastros/grupos", icon: UsersRound },
          { name: "Pesquisa Satisfação", href: "/cadastros/pesquisa", icon: ClipboardList },
        ],
      },
      {
        label: "Fidelização",
        items: [
          { name: "Lembretes", href: "/cadastros/lembretes", icon: Bell },
          { name: "Produtos / Estoque", href: "/gestao/produtos", icon: Package },
          { name: "Clube de Vantagens", href: "/cadastros/clube-vantagens", icon: Gift },
          { name: "Cupom de Desconto", href: "/cadastros/cupons", icon: Ticket },
          { name: "Clube de Fidelidade", href: "/clube", icon: Award },
        ],
      },
      {
        label: "Assinaturas",
        items: [
          { name: "Planos de Assinatura", href: "/cadastros/clubes", icon: Crown },
          { name: "Assinantes", href: "/cadastros/assinantes", icon: Users },
        ],
      },
    ],
  },
  {
    name: "Comandas",
    icon: Receipt,
    roles: ["dono", "gerente"],
    children: [
      { name: "Comandas Abertas", href: "/comandas/abertas", icon: Receipt },
      { name: "Histórico", href: "/comandas/historico", icon: History },
    ],
  },
  { 
    name: "Financeiro", 
    icon: DollarSign,
    roles: ["dono", "gerente"],
    children: [
      { name: "Caixa", href: "/financeiro/caixa", icon: DollarSign },
      { name: "Histórico Caixa", href: "/financeiro/historico", icon: History },
      { name: "Entrada/Saída", href: "/financeiro/movimentacoes", icon: ArrowUpDown },
      { name: "Comissões", href: "/financeiro/comissoes", icon: Percent },
      { name: "Conta do Cliente", href: "/financeiro/conta-cliente", icon: Users },
      { name: "Estoque", href: "/gestao/produtos", icon: Package },
      { name: "Fluxo de Caixa", href: "/financeiro/fluxo", icon: TrendingUp },
      { name: "Conta Profissional", href: "/financeiro/conta-profissional", icon: UsersRound },
      { name: "Caixinha", href: "/financeiro/caixinha", icon: Wallet },
    ],
  },
  {
    name: "Relatórios",
    icon: BarChart3,
    roles: ["dono", "gerente"],
    subgroups: [
      {
        label: "Agendamentos",
        items: [
          { name: "Geral", href: "/relatorios/agendamentos", icon: CalendarDays },
          { name: "Clientes", href: "/relatorios/perfil-cliente", icon: Users },
          { name: "Profissionais", href: "/relatorios/rankings", icon: Star },
          { name: "Informações", href: "/relatorios/resumo", icon: LayoutDashboard },
          { name: "Aniversariantes", href: "/relatorios/aniversariantes", icon: Gift },
        ],
      },
      {
        label: "Gerencial",
        items: [
          { name: "Faturamento", href: "/relatorios", icon: DollarSign },
          { name: "Financeiro", href: "/relatorios/financeiro", icon: TrendingUp },
          { name: "Dias sem Vir", href: "/relatorios/dias-sem-vir", icon: Clock },
          { name: "Lucro Produtos", href: "/relatorios/lucro-produtos", icon: Package },
          { name: "Comandas Canceladas", href: "/relatorios/canceladas", icon: ClipboardList },
          { name: "Comandas Itens", href: "/relatorios/comandas-itens", icon: Newspaper },
          { name: "Estoque", href: "/relatorios/estoque", icon: Package },
          { name: "Pacotes", href: "/relatorios/pacotes", icon: Boxes },
          { name: "Rankings", href: "/relatorios/rankings-gerencial", icon: Star },
        ],
      },
    ],
  },
  {
    name: "Configurações",
    icon: Settings,
    roles: ["dono", "gerente"],
    children: [
      { name: "Parâmetros", href: "/configuracoes/parametros", icon: Settings },
      { name: "Rodízio", href: "/configuracoes/rodizio", icon: UsersRound },
      { name: "Perfis de Acesso", href: "/configuracoes/acessos", icon: Shield, roles: ["dono"] },
      { name: "Templates E-mail", href: "/configuracoes/templates", icon: Mail, roles: ["dono"] },
    ],
    subgroups: [
      {
        label: "Fila de Espera",
        items: [
          { name: "Ordem de Chegada", href: "/configuracoes/ordem-chegada", icon: ClipboardList },
          { name: "Lista de Espera", href: "/lista-espera", icon: Users },
        ],
      },
      {
        label: "Anamnese",
        items: [
          { name: "Formulários", href: "/configuracoes/anamnese-formularios", icon: FileText },
          { name: "Clientes", href: "/configuracoes/anamnese-clientes", icon: Users },
        ],
      },
      {
        label: "Documentos",
        items: [
          { name: "Meus Documentos", href: "/configuracoes/documentos", icon: FileText },
          { name: "Clientes", href: "/configuracoes/documentos-clientes", icon: Users },
          { name: "Profissionais", href: "/configuracoes/documentos-profissionais", icon: UsersRound },
        ],
      },
      {
        label: "Outros",
        items: [
          { name: "Avaliações", href: "/avaliacoes", icon: Star },
          { name: "Lista de Restrições", href: "/configuracoes/restricoes", icon: ShieldAlert },
          { name: "Funcionamento", href: "/configuracoes/funcionamento", icon: Clock },
          { name: "Alertas", href: "/configuracoes/alertas", icon: Bell },
        ],
      },
    ],
  },
  { name: "Meu Estúdio", href: "/empresa", icon: Building2, roles: ["dono"] },
  { name: "Equipe", href: "/equipe", icon: UsersRound, roles: ["dono"] },
];

function CreditCardIcon(props: any) { return <DollarSign {...props} />; }

const HREF_TO_PERMISSION: Record<string, string> = {
  "/dashboard": "dashboard",
  "/agenda": "agenda",
  "/agenda/picos": "agenda_picos",
  "/gestao/clientes": "clientes",
  "/gestao/profissionais": "profissionais",
  "/gestao/servicos": "servicos",
  "/gestao/produtos": "produtos",
  "/cadastros/tipos": "tipos",
  "/cadastros/cupons": "cupons",
  "/mensagens": "mensagens",
  "/cadastros/lembretes": "lembretes",
  "/avaliacoes": "avaliacoes",
  "/clube": "clube",
  "/cadastros/clubes": "clubes_assinatura",
  "/cadastros/assinantes": "clubes_assinatura",
  "/cadastros/noticias": "noticias",
  "/cadastros/grupos": "noticias",
  "/cadastros/pesquisa": "pesquisa",
  "/cadastros/clube-vantagens": "clube",
  "/pacotes": "pacotes",
  "/pacotes/vendas": "venda_pacotes",
  "/comandas/abertas": "comandas",
  "/comandas/historico": "comandas",
  "/financeiro/caixa": "caixa",
  "/financeiro/historico": "caixa",
  "/financeiro/movimentacoes": "caixa",
  "/financeiro/comissoes": "financeiro",
  "/financeiro/conta-cliente": "financeiro",
  "/financeiro/fluxo": "financeiro",
  "/financeiro/conta-profissional": "financeiro",
  "/financeiro/caixinha": "financeiro",
  "/relatorios": "relatorios",
  "/relatorios/resumo": "relatorios",
  "/relatorios/aniversariantes": "relatorios",
  "/relatorios/agendamentos": "relatorios",
  "/relatorios/financeiro": "relatorios",
  "/relatorios/canceladas": "relatorios",
  "/relatorios/rankings": "relatorios",
  "/relatorios/rankings-gerencial": "relatorios",
  "/relatorios/perfil-cliente": "relatorios",
  "/relatorios/estoque": "relatorios",
  "/relatorios/pacotes": "relatorios",
  "/relatorios/comandas-itens": "relatorios",
  "/caixa": "caixa",
  "/financeiro": "financeiro",
  "/lista-espera": "lista_espera",
  "/configuracoes/parametros": "configuracoes",
  "/configuracoes/acessos": "configuracoes",
  "/configuracoes/templates": "configuracoes",
  "/configuracoes/rodizio": "configuracoes",
  "/configuracoes/ordem-chegada": "configuracoes",
  "/configuracoes/anamnese-formularios": "configuracoes",
  "/configuracoes/anamnese-clientes": "configuracoes",
  "/configuracoes/documentos": "configuracoes",
  "/configuracoes/documentos-clientes": "configuracoes",
  "/configuracoes/documentos-profissionais": "configuracoes",
  "/configuracoes/restricoes": "configuracoes",
  "/configuracoes/funcionamento": "configuracoes",
  "/configuracoes/alertas": "configuracoes",
  "/empresa": "empresa",
  "/equipe": "equipe",
};

function hasPermission(href: string | undefined, perms: string[] | null): boolean {
  if (!perms) return true;
  if (!href) return true;
  const cleanHref = href.split("?")[0];
  const key = HREF_TO_PERMISSION[cleanHref];
  if (!key) return true;
  return perms.includes(key);
}

function filterNavByRole(items: NavItem[], role: string, perfilPermissoes?: string[] | null): NavItem[] {
  return items.reduce<NavItem[]>((acc, item) => {
    if (item.roles && !item.roles.includes(role)) return acc;
    if (item.children || item.subgroups) {
      const filteredChildren = (item.children || []).filter(
        child => (!child.roles || child.roles.includes(role)) && hasPermission(child.href, perfilPermissoes ?? null)
      );
      const filteredSubgroups = item.subgroups?.map(sg => ({
        ...sg,
        items: sg.items.filter(sub => hasPermission(sub.href, perfilPermissoes ?? null)),
      })).filter(sg => sg.items.length > 0);
      if (filteredChildren.length > 0 || (filteredSubgroups && filteredSubgroups.length > 0)) {
        acc.push({ ...item, children: filteredChildren, subgroups: filteredSubgroups });
      }
    } else {
      if (hasPermission(item.href, perfilPermissoes ?? null)) {
        acc.push(item);
      }
    }
    return acc;
  }, []);
}

function isGroupActive(item: NavItem, location: string): boolean {
  const loc = location.split("?")[0];
  if (item.children?.some(c => c.href && (loc === c.href.split("?")[0] || loc.startsWith(c.href.split("?")[0] + '/')))) return true;
  if (item.subgroups?.some(sg => sg.items.some(s => s.href && (loc === s.href.split("?")[0] || loc.startsWith(s.href.split("?")[0] + '/'))))) return true;
  return false;
}

function CollapsibleGroup({ item, location, onNavigate, mainRef }: { item: NavItem; location: string; onNavigate: () => void; mainRef: React.RefObject<HTMLDivElement | null> }) {
  const active = isGroupActive(item, location);
  const [open, setOpen] = React.useState(active);
  const clickedRef = React.useRef(false);

  React.useEffect(() => {
    if (clickedRef.current && active) {
      setOpen(true);
      clickedRef.current = false;
    }
  }, [location, active]);

  const handleLinkClick = () => {
    clickedRef.current = true;
    onNavigate();
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const loc = location.split("?")[0];

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150",
          active
            ? "text-primary bg-primary/[0.06]"
            : "text-foreground/50 hover:text-foreground hover:bg-black/[0.03]"
        )}
      >
        <item.icon className="h-[16px] w-[16px]" />
        <span className="flex-1 text-left">{item.name}</span>
        <ChevronDown className={cn(
          "h-3.5 w-3.5 transition-transform duration-200",
          open ? "rotate-0" : "-rotate-90"
        )} />
      </button>

      <div className={cn(
        "overflow-hidden transition-all duration-200",
        open ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="ml-2 pl-3 border-l border-black/[0.06] mt-0.5 space-y-0.5">
          {(item.children || []).map(child => (
            <Link key={child.name + (child.href || '')} href={child.href!} className={cn(
              "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150",
              loc === child.href?.split("?")[0]
                ? "bg-foreground text-white"
                : "text-foreground/45 hover:text-foreground hover:bg-black/[0.03]"
            )} onClick={handleLinkClick}>
              <child.icon className="h-[14px] w-[14px]" />
              {child.name}
            </Link>
          ))}

          {item.subgroups?.map(sg => (
            <div key={sg.label} className="mt-1.5">
              <div className="px-3 py-1 text-[10px] font-semibold text-foreground/25 uppercase tracking-wider">
                {sg.label}
              </div>
              {sg.items.map(sub => (
                <Link key={sub.name + (sub.href || '')} href={sub.href!} className={cn(
                  "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150",
                  loc === sub.href?.split("?")[0]
                    ? "bg-foreground text-white"
                    : "text-foreground/45 hover:text-foreground hover:bg-black/[0.03]"
                )} onClick={handleLinkClick}>
                  <sub.icon className="h-[14px] w-[14px]" />
                  {sub.name}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout, isLoading, barbeariaId, role, perfilPermissoes } = useAuth();
  const { canAccess, status, shouldShowUpgrade, trialDaysLeft } = useSubscriptionGuard();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const mainContentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [location]);

  React.useEffect(() => {
    if (!isLoading) {
      if (!user) {
        window.location.href = "/login";
      } else if (role === "dono" && !barbeariaId && !location.startsWith("/onboarding")) {
        window.location.href = "/onboarding/barbearia";
      }
    }
  }, [user, isLoading, barbeariaId, location, role]);

  React.useEffect(() => {
    if (user && (user as any).tema) {
      applyTheme((user as any).tema);
    }
  }, [user]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#fafafa]"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div></div>;
  }

  if (!user) return null;

  if (!canAccess && status !== "none") {
    const isTrialExpired = status === "trial_expired";
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] p-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className={`h-16 w-16 rounded-2xl flex items-center justify-center mx-auto ${isTrialExpired ? "bg-primary/10" : "bg-red-500/8"}`}>
            {isTrialExpired ? (
              <Crown className="h-8 w-8 text-primary" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-red-500" />
            )}
          </div>
          <div>
            <h1 className="text-[22px] font-bold text-foreground mb-2">
              {isTrialExpired
                ? "Período de Teste Encerrado"
                : status === "cancelado"
                ? "Assinatura Cancelada"
                : "Assinatura Inativa"}
            </h1>
            <p className="text-foreground/45 text-[14px] leading-relaxed">
              {isTrialExpired
                ? "Seus 30 dias de teste gratuito acabaram. Escolha um plano para continuar usando o Glow Up e não perder seus dados."
                : status === "cancelado"
                ? "Sua assinatura foi cancelada. Renove seu plano para continuar usando a plataforma."
                : "Sua assinatura está inativa. Atualize seu plano para voltar a usar todas as funcionalidades."}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Link href="/#precos">
              <Button size="lg" className="w-full rounded-xl h-11 text-[14px] font-medium">
                {isTrialExpired ? "Escolher Plano" : "Ver Planos"}
              </Button>
            </Link>
            <Button size="lg" variant="outline" onClick={logout} className="rounded-xl h-11 text-[14px]">Sair</Button>
          </div>
        </div>
      </div>
    );
  }

  const handleNavClick = () => {
    setMobileMenuOpen(false);
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const filteredNav = filterNavByRole(NAV_ITEMS, role, perfilPermissoes);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#fafafa]">
      <div className="md:hidden flex items-center justify-between px-4 py-2.5 border-b border-black/[0.04] bg-white">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="h-8 w-8 shrink-0">
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
          <div className="font-semibold text-[14px] text-foreground tracking-tight flex items-center gap-1.5">
            <Sparkles className="h-[16px] w-[16px] text-primary" /> {APP_NAME}
          </div>
        </div>
        <HeaderBar />
      </div>

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-[240px] bg-white border-r border-black/[0.04] transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="px-5 py-5 hidden md:flex items-center gap-2.5 font-semibold text-[15px] text-foreground tracking-tight shrink-0">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          {APP_NAME}
        </div>

        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5 sidebar-scroll">
          {filteredNav.map((item) => (
            <div key={item.name}>
              {(item.children || item.subgroups) ? (
                <CollapsibleGroup
                  item={item}
                  location={location}
                  onNavigate={handleNavClick}
                  mainRef={mainContentRef}
                />
              ) : (
                <Link href={item.href!} className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150",
                  location === item.href || location.startsWith(item.href + '/')
                    ? "bg-foreground text-white" 
                    : "text-foreground/50 hover:text-foreground hover:bg-black/[0.03]"
                )} onClick={handleNavClick}>
                  <item.icon className="h-[16px] w-[16px]" />
                  {item.name}
                </Link>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-black/[0.04] shrink-0">
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
        <div className="hidden md:flex items-center justify-end px-6 py-2.5 border-b border-black/[0.04] bg-white shrink-0">
          <HeaderBar />
        </div>
        {shouldShowUpgrade && (
          <div className={`border-b px-4 py-2 flex items-center justify-center gap-3 z-20 shrink-0 ${
            trialDaysLeft >= 0 && trialDaysLeft <= 5
              ? "bg-red-50 border-red-100"
              : trialDaysLeft >= 0 && trialDaysLeft <= 10
              ? "bg-amber-50 border-amber-100"
              : "bg-primary/5 border-primary/10"
          }`}>
            {trialDaysLeft >= 0 && trialDaysLeft <= 5 ? (
              <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
            )}
            <span className={`text-[13px] ${trialDaysLeft >= 0 && trialDaysLeft <= 5 ? "text-red-600 font-medium" : trialDaysLeft >= 0 && trialDaysLeft <= 10 ? "text-amber-700" : "text-foreground/60"}`}>
              {trialDaysLeft > 0
                ? `${trialDaysLeft} dia${trialDaysLeft !== 1 ? "s" : ""} restante${trialDaysLeft !== 1 ? "s" : ""} de teste grátis`
                : "Período de teste gratuito ativo"}
            </span>
            <Link href="/#precos">
              <Button size="sm" variant="outline" className={`text-[11px] h-6 px-2.5 rounded-full ${
                trialDaysLeft >= 0 && trialDaysLeft <= 5
                  ? "border-red-300 text-red-600 hover:bg-red-50"
                  : "border-primary/20 text-primary"
              }`}>
                Escolher Plano
              </Button>
            </Link>
          </div>
        )}
        <div ref={mainContentRef} className="flex-1 overflow-y-auto p-5 md:p-8 z-10 main-scroll">
          {children}
        </div>
      </main>
      
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}
    </div>
  );
}
