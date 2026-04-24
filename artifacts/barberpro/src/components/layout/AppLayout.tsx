import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionGuard } from "@/hooks/useSubscriptionGuard";
import { cn } from "@/lib/utils";
import { getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { apiUrl } from "@/lib/utils";
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
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME, getRoleLabel } from "@/lib/utils";
import { HeaderBar, applyTheme } from "./HeaderBar";
import { MobileBottomBar } from "./MobileBottomBar";
import { usePWA } from "@/hooks/usePWA";
import { TutorialOverlay } from "@/components/TutorialOverlay";
import LgpdConsentDialog from "@/components/LgpdConsentDialog";

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
          { name: "Inbox Agendamentos", href: "/comunicacao/inbox", icon: Inbox },
          { name: "E-mail Marketing", href: "/comunicacao/email-marketing", icon: Mail, roles: ["dono", "gerente"] },
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

const HREF_TO_TUTORIAL: Record<string, string> = {
  "/dashboard": "dashboard",
  "/agenda": "agenda",
  "/gestao/servicos": "servicos",
  "/gestao/profissionais": "profissionais",
  "/gestao/clientes": "clientes",
  "/comandas/abertas": "comandas",
  "/empresa": "empresa",
  "/configuracoes/parametros": "parametros",
};

const NAV_GROUP_TUTORIAL_IDS: Record<string, string> = {
  "Cadastros": "cadastros-group",
  "Comandas": "comandas-group",
  "Configurações": "configuracoes-group",
  "Financeiro": "financeiro-group",
  "Relatórios": "relatorios-group",
};

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
  "/relatorios/dias-sem-vir": "relatorios",
  "/relatorios/lucro-produtos": "relatorios",
  "/comunicacao/email-marketing": "mensagens",
  "/comunicacao/email-marketing/nova": "mensagens",
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

function isSubgroupActive(sg: { label: string; items: NavItem[] }, location: string): boolean {
  const loc = location.split("?")[0];
  return sg.items.some(s => s.href && (loc === s.href.split("?")[0] || loc.startsWith(s.href.split("?")[0] + '/')));
}

const CollapsibleSubgroup = React.memo(function CollapsibleSubgroup({ sg, location, onLinkClick, badgeCounts }: { sg: { label: string; items: NavItem[] }; location: string; onLinkClick: () => void; badgeCounts?: Record<string, number> }) {
  const active = isSubgroupActive(sg, location);
  const [open, setOpen] = React.useState(active);
  const loc = location.split("?")[0];

  React.useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  return (
    <div className="mt-1.5">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider cursor-pointer",
          active
            ? "text-primary/60 hover:text-primary/80"
            : "text-foreground/25 hover:text-foreground/40 hover:bg-muted/50"
        )}
      >
        <ChevronDown className={cn(
          "h-2.5 w-2.5 shrink-0",
          open ? "rotate-0" : "-rotate-90"
        )} />
        <span className="flex-1 text-left">{sg.label}</span>
      </button>
      {open && (
        <div className="space-y-0.5 mt-0.5">
          {sg.items.map(sub => {
            const badgeCount = sub.href && badgeCounts ? badgeCounts[sub.href] : 0;
            return (
            <Link key={sub.name + (sub.href || '')} href={sub.href!} className={cn(
              "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] font-medium",
              loc === sub.href?.split("?")[0]
                ? "bg-foreground text-background"
                : "text-foreground/45 hover:text-foreground hover:bg-muted/50"
            )} onClick={onLinkClick} {...(sub.href && HREF_TO_TUTORIAL[sub.href.split("?")[0]] ? { "data-tutorial": HREF_TO_TUTORIAL[sub.href.split("?")[0]] } : {})}>
              <sub.icon className="h-[14px] w-[14px]" />
              <span className="flex-1">{sub.name}</span>
              {badgeCount > 0 && (
                <span className="bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center leading-none">
                  {badgeCount}
                </span>
              )}
            </Link>
            );
          })}
        </div>
      )}
    </div>
  );
});

const CollapsibleGroup = React.memo(function CollapsibleGroup({ item, location, onNavigate, mainRef, badgeCounts }: { item: NavItem; location: string; onNavigate: () => void; mainRef: React.RefObject<HTMLDivElement | null>; badgeCounts?: Record<string, number> }) {
  const active = isGroupActive(item, location);
  const [open, setOpen] = React.useState(active);
  const clickedRef = React.useRef(false);

  React.useEffect(() => {
    if (clickedRef.current && active) {
      setOpen(true);
      clickedRef.current = false;
    }
  }, [location, active]);

  const handleLinkClick = React.useCallback(() => {
    clickedRef.current = true;
    onNavigate();
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0 });
    }
  }, [onNavigate, mainRef]);

  const loc = location.split("?")[0];

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        {...(NAV_GROUP_TUTORIAL_IDS[item.name] ? { "data-tutorial": NAV_GROUP_TUTORIAL_IDS[item.name] } : {})}
        className={cn(
          "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium",
          active
            ? "text-primary bg-primary/[0.06]"
            : "text-foreground/50 hover:text-foreground hover:bg-muted/50"
        )}
      >
        <item.icon className="h-[16px] w-[16px]" />
        <span className="flex-1 text-left">{item.name}</span>
        <ChevronDown className={cn(
          "h-3.5 w-3.5",
          open ? "rotate-0" : "-rotate-90"
        )} />
      </button>

      {open && (
        <div className="ml-2 pl-3 border-l border-border mt-0.5 space-y-0.5">
          {(item.children || []).map(child => (
            <Link key={child.name + (child.href || '')} href={child.href!} className={cn(
              "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] font-medium",
              loc === child.href?.split("?")[0]
                ? "bg-foreground text-background"
                : "text-foreground/45 hover:text-foreground hover:bg-muted/50"
            )} onClick={handleLinkClick} {...(child.href && HREF_TO_TUTORIAL[child.href.split("?")[0]] ? { "data-tutorial": HREF_TO_TUTORIAL[child.href.split("?")[0]] } : {})}>
              <child.icon className="h-[14px] w-[14px]" />
              {child.name}
            </Link>
          ))}

          {item.subgroups?.map(sg => (
            <CollapsibleSubgroup
              key={sg.label}
              sg={sg}
              location={location}
              onLinkClick={handleLinkClick}
              badgeCounts={badgeCounts}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout, isLoading, barbeariaId, role, perfilPermissoes, logoUrl, barbeariaNome, barbeariaSlug } = useAuth();
  const { canAccess, status, shouldShowUpgrade, trialDaysLeft } = useSubscriptionGuard();

  const basePath = import.meta.env.BASE_URL || "/";
  usePWA({
    slug: barbeariaSlug || undefined,
    nome: barbeariaNome || undefined,
    logoUrl: logoUrl || null,
    corPrimaria: undefined,
    startUrl: `${basePath}agenda`,
  });
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [showTutorial, setShowTutorial] = React.useState(false);
  const [sidebarSearch, setSidebarSearch] = React.useState("");
  const mainContentRef = React.useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0 });
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
    if (user && user.tema) {
      applyTheme(user.tema);
    }
  }, [user]);

  const { data: inboxCount } = useQuery<{ count: number }>({
    queryKey: ["agendamento-mensagens-inbox-count", barbeariaId],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/agendamento-mensagens/inbox/count`), {
        credentials: "include",
      });
      if (!res.ok) return { count: 0 };
      return res.json();
    },
    enabled: !!barbeariaId && !!user,
    refetchInterval: 30000,
  });

  const prevPendentesCountRef = React.useRef<number>(0);
  const { data: pendentesCount } = useQuery<{ count: number }>({
    queryKey: ["agendamentos-pendentes-count", barbeariaId],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/agendamentos/pendentes-count`), {
        credentials: "include",
      });
      if (!res.ok) return { count: 0 };
      return res.json();
    },
    enabled: !!barbeariaId && !!user,
    refetchInterval: 30000,
  });

  React.useEffect(() => {
    const current = pendentesCount?.count || 0;
    const prev = prevPendentesCountRef.current;
    if (current > prev && prev !== 0 || (current > 0 && prev === 0 && document.visibilityState === "visible" && performance.now() > 5000)) {
      try {
        type AudioContextCtor = typeof AudioContext;
        const w = window as Window & { webkitAudioContext?: AudioContextCtor };
        const AC: AudioContextCtor | undefined = w.AudioContext || w.webkitAudioContext;
        if (AC) {
          const ctx = new AC();
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = "sine";
          o.frequency.value = 880;
          g.gain.setValueAtTime(0.0001, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
          o.connect(g).connect(ctx.destination);
          o.start();
          o.stop(ctx.currentTime + 0.5);
          setTimeout(() => {
            const o2 = ctx.createOscillator();
            const g2 = ctx.createGain();
            o2.type = "sine";
            o2.frequency.value = 1175;
            g2.gain.setValueAtTime(0.0001, ctx.currentTime);
            g2.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
            g2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
            o2.connect(g2).connect(ctx.destination);
            o2.start();
            o2.stop(ctx.currentTime + 0.5);
            setTimeout(() => ctx.close().catch(() => {}), 700);
          }, 220);
        }
      } catch {}
    }
    prevPendentesCountRef.current = current;
  }, [pendentesCount?.count]);

  const { data: layoutParams } = useQuery({
    queryKey: ["parametros-layout", barbeariaId],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/parametros`), { credentials: "include" });
      const rows: { chave: string; valor: string }[] = await res.json();
      const map: Record<string, string> = {};
      for (const r of rows) map[r.chave] = r.valor;
      return map;
    },
    enabled: !!barbeariaId,
    staleTime: 5 * 60 * 1000,
  });

  React.useEffect(() => {
    if (!layoutParams) return;
    const tema = layoutParams["tema_layout"] || "Claro";
    const html = document.documentElement;
    html.classList.remove("dark");
    if (tema === "Escuro") {
      html.classList.add("dark");
    } else if (tema === "Automático") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) html.classList.add("dark");
      const listener = (e: MediaQueryListEvent) => {
        if (e.matches) html.classList.add("dark");
        else html.classList.remove("dark");
      };
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", listener);
      return () => mq.removeEventListener("change", listener);
    }
  }, [layoutParams]);

  React.useEffect(() => {
    if (!layoutParams) return;
    const fonte = layoutParams["fonte_webadmin"] || "Inter";
    const FONT_MAP: Record<string, string> = {
      "Inter": "'Inter'",
      "Quicksand": "'Quicksand'",
      "Mulish": "'Mulish'",
      "Dosis": "'Dosis'",
      "Didact Gothic": "'Didact Gothic'",
    };
    const fontFamily = FONT_MAP[fonte] || "'Inter'";
    if (fonte !== "Inter") {
      const id = "dynamic-font-link";
      let link = document.getElementById(id) as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        document.head.appendChild(link);
      }
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fonte)}:wght@300;400;500;600;700&display=swap`;
    }
    document.documentElement.style.setProperty("--font-sans", `${fontFamily}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`);
    document.documentElement.style.setProperty("--font-display", `${fontFamily}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`);
  }, [layoutParams]);

  React.useEffect(() => {
    if (!user || isLoading) return;
    if (role !== "dono") return;
    const onboardingCompleto = user.onboardingCompleto ?? false;
    const tutorialCompleto = user.tutorialCompleto ?? false;
    if (onboardingCompleto && !tutorialCompleto) {
      setShowTutorial(true);
    }
  }, [user, isLoading, role]);

  React.useEffect(() => {
    const handler = () => setShowTutorial(true);
    window.addEventListener("open-tutorial", handler);
    return () => window.removeEventListener("open-tutorial", handler);
  }, []);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div></div>;
  }

  if (!user) return null;

  if (!canAccess && status !== "none") {
    const isTrialExpired = status === "trial_expired";
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
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
                ? "Seu período de teste gratuito terminou. Escolha um plano para continuar usando todas as funcionalidades."
                : status === "cancelado"
                ? "Sua assinatura foi cancelada. Renove para voltar a usar o sistema."
                : "Sua assinatura está inativa. Atualize seu plano para voltar a usar todas as funcionalidades."}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Link href="/#pricing">
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

  const handleNavClick = React.useCallback(() => {
    setMobileMenuOpen(false);
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0 });
    }
  }, []);

  const filteredNav = React.useMemo(
    () => filterNavByRole(NAV_ITEMS, role, perfilPermissoes),
    [role, perfilPermissoes]
  );

  const searchResults = React.useMemo(() => {
    const q = sidebarSearch.trim().toLowerCase();
    if (!q) return null;
    const results: { name: string; href: string; icon: any; parent?: string }[] = [];
    const collect = (items: NavItem[], parentName?: string) => {
      for (const item of items) {
        if (item.href && item.name.toLowerCase().includes(q)) {
          results.push({ name: item.name, href: item.href, icon: item.icon, parent: parentName });
        }
        if (item.children) collect(item.children, item.name);
        if (item.subgroups) {
          for (const sg of item.subgroups) {
            collect(sg.items, item.name);
          }
        }
      }
    };
    collect(filteredNav);
    return results;
  }, [sidebarSearch, filteredNav]);

  return (
    <div className="h-screen overflow-hidden flex flex-col md:flex-row bg-background">
      <div className="md:hidden flex items-center justify-between px-3 py-2 border-b border-border bg-card safe-area-top">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="h-9 w-9 shrink-0">
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="font-semibold text-[14px] text-foreground tracking-tight flex items-center gap-1.5 min-w-0">
            {logoUrl ? (
              <img src={logoUrl} alt={barbeariaNome || APP_NAME} className="h-[24px] w-[24px] object-contain rounded-full shrink-0" />
            ) : (
              <img src="/logo-icon.png" alt={APP_NAME} className="h-[24px] w-[24px] object-contain shrink-0" />
            )}
            <span className="truncate">{barbeariaNome || APP_NAME}</span>
          </div>
        </div>
        <div className="shrink-0">
          <HeaderBar />
        </div>
      </div>

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-[240px] bg-card border-r border-border transform transition-transform duration-200 ease-out md:relative md:translate-x-0 flex flex-col will-change-transform",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="hidden md:flex flex-col shrink-0">
          <div className="px-4 pt-4 pb-2 text-center font-semibold text-[14px] text-foreground tracking-tight truncate">
            {barbeariaNome || APP_NAME}
          </div>
          <div className="px-4 pb-4">
            <div
              className="w-full rounded-lg overflow-hidden bg-muted border border-border"
              style={{ aspectRatio: "16/9" }}
            >
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <img src="/logo-icon.png" alt={APP_NAME} className="h-14 w-14 object-contain opacity-60" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-3 pt-2 pb-1 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/30" />
            <input
              type="text"
              placeholder="Buscar no menu..."
              value={sidebarSearch}
              onChange={e => setSidebarSearch(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-border bg-muted/50 text-[12px] text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/30 transition-all"
            />
            {sidebarSearch && (
              <button onClick={() => setSidebarSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/60">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-3 space-y-0.5 sidebar-scroll">
          {searchResults ? (
            searchResults.length > 0 ? (
              searchResults.map(r => (
                <Link
                  key={r.href}
                  href={r.href}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150",
                    location.split("?")[0] === r.href.split("?")[0]
                      ? "bg-foreground text-background"
                      : "text-foreground/50 hover:text-foreground hover:bg-muted/50"
                  )}
                  onClick={() => { setSidebarSearch(""); handleNavClick(); }}
                >
                  <r.icon className="h-[14px] w-[14px]" />
                  <div className="flex-1 min-w-0">
                    <span>{r.name}</span>
                    {r.parent && <span className="text-[10px] text-foreground/30 ml-1.5">{r.parent}</span>}
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-center text-foreground/30 text-[12px] py-6">Nenhum resultado</p>
            )
          ) : (
            filteredNav.map((item) => (
              <div key={item.name}>
                {(item.children || item.subgroups) ? (
                  <CollapsibleGroup
                    item={item}
                    location={location}
                    onNavigate={handleNavClick}
                    mainRef={mainContentRef}
                    badgeCounts={{ "/comunicacao/inbox": inboxCount?.count || 0 }}
                  />
                ) : (
                  <Link href={item.href!} className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150",
                    location === item.href || location.startsWith(item.href + '/')
                      ? "bg-foreground text-background" 
                      : "text-foreground/50 hover:text-foreground hover:bg-muted/50"
                  )} onClick={handleNavClick} {...(HREF_TO_TUTORIAL[item.href!] ? { "data-tutorial": HREF_TO_TUTORIAL[item.href!] } : {})}>
                    <item.icon className="h-[16px] w-[16px]" />
                    <span className="flex-1">{item.name}</span>
                    {item.href === "/agenda" && (pendentesCount?.count || 0) > 0 && (
                      <span className="ml-auto inline-flex items-center justify-center px-2 h-[20px] rounded-full bg-red-600 text-white text-[10px] font-semibold animate-pulse whitespace-nowrap" data-testid="badge-pendentes-agenda" title="Agendamentos aguardando confirmação">
                        Pendentes: {pendentesCount?.count}
                      </span>
                    )}
                  </Link>
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-border shrink-0">
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
            className="w-full justify-start text-foreground/40 hover:text-red-500 hover:bg-destructive/10 text-[13px] h-8 rounded-lg" 
            onClick={logout}
          >
            <LogOut className="mr-2 h-3.5 w-3.5" /> Sair
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-h-0 relative">
        <div className="hidden md:flex items-center justify-end px-6 py-2.5 border-b border-border bg-card shrink-0">
          <HeaderBar />
        </div>
        {shouldShowUpgrade && (
          <div className={`border-b px-3 py-1.5 sm:px-4 sm:py-2 flex items-center justify-center gap-2 sm:gap-3 z-20 shrink-0 ${
            trialDaysLeft >= 0 && trialDaysLeft <= 5
              ? "bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/30"
              : trialDaysLeft >= 0 && trialDaysLeft <= 10
              ? "bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/30"
              : "bg-primary/5 border-primary/10"
          }`}>
            {trialDaysLeft >= 0 && trialDaysLeft <= 5 ? (
              <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
            )}
            <span className={`text-[11px] sm:text-[13px] ${trialDaysLeft >= 0 && trialDaysLeft <= 5 ? "text-red-600 dark:text-red-400 font-medium" : trialDaysLeft >= 0 && trialDaysLeft <= 10 ? "text-amber-700 dark:text-amber-400" : "text-foreground/60"}`}>
              {trialDaysLeft > 0
                ? `${trialDaysLeft} dia${trialDaysLeft !== 1 ? "s" : ""} restante${trialDaysLeft !== 1 ? "s" : ""} de teste grátis`
                : "Período de teste gratuito ativo"}
            </span>
            <Link href="/#pricing">
              <Button size="sm" variant="outline" className={`text-[11px] h-6 px-2.5 rounded-full ${
                trialDaysLeft >= 0 && trialDaysLeft <= 5
                  ? "border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50"
                  : "border-primary/20 text-primary"
              }`}>
                Escolher Plano
              </Button>
            </Link>
          </div>
        )}
        <div ref={mainContentRef} className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-8 pb-24 md:pb-8 z-10 main-scroll">
          {children}
        </div>
      </main>
      
      <MobileBottomBar />
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {showTutorial && (
        <TutorialOverlay
          onClose={() => {
            setShowTutorial(false);
            queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
            queryClient.refetchQueries({ queryKey: getGetCurrentUserQueryKey() });
          }}
          onComplete={() => {
            setShowTutorial(false);
            queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
            queryClient.refetchQueries({ queryKey: getGetCurrentUserQueryKey() });
          }}
        />
      )}

      <LgpdConsentDialog open={!!user && !(user as any).lgpdConsentido && !showTutorial} />

      {location === "/empresa" && (
        <a
          href="https://wa.me/5586981418877?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20o%20Glow%20Upi"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-[88px] md:bottom-6 right-4 md:right-6 z-40 h-12 w-12 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center shadow-lg shadow-green-500/30 transition-all hover:scale-110"
          title="Suporte via WhatsApp"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </a>
      )}
    </div>
  );
}
