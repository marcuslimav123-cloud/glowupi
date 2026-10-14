// Estrutura única de navegação do painel: usada pelo menu lateral (desktop),
// pela gaveta mobile e pela página /menu. Para mudar o menu, mude só aqui.
import {
  LayoutDashboard, CalendarDays, Users, Receipt, History, Search, FolderOpen, UsersRound, Heart, Package,
  Boxes, ShoppingCart, Crown, Ticket, Tag, Megaphone, MessageSquare, Inbox, Mail, Bell, Award, Star,
  ClipboardList, DollarSign, ArrowUpDown, Percent, TrendingUp, Wallet, BarChart3, Gift, Clock, Settings,
  Shield, Building2, Activity, FileText, Landmark, type LucideIcon,
} from "lucide-react";

export type NavItem = {
  name: string;
  href?: string;
  icon: LucideIcon;
  /** Papéis que enxergam o item. Sem valor = todos. */
  roles?: string[];
  /** Texto curto para o menu mobile. */
  description?: string;
  children?: NavItem[];
};

const GESTAO = ["dono", "gerente"];

export const NAV_ITEMS: NavItem[] = [
  { name: "Início", href: "/dashboard", icon: LayoutDashboard, description: "Resumo do dia" },
  { name: "Agenda", href: "/agenda", icon: CalendarDays, description: "Horários e atendimentos" },
  { name: "Clientes", href: "/gestao/clientes", icon: Users, roles: GESTAO, description: "Cadastro e histórico" },
  {
    name: "Comandas",
    icon: Receipt,
    roles: GESTAO,
    children: [
      { name: "Comandas abertas", href: "/comandas/abertas", icon: Receipt, description: "Atendimentos de hoje para fechar" },
      { name: "Histórico", href: "/comandas/historico", icon: History, description: "Comandas fechadas por período" },
      { name: "Venda avulsa e busca", href: "/caixa", icon: Search, description: "Vender sem agendamento, reabrir e imprimir" },
    ],
  },
  {
    name: "Cadastros",
    icon: FolderOpen,
    roles: GESTAO,
    children: [
      { name: "Profissionais", href: "/gestao/profissionais", icon: UsersRound, description: "Equipe, horários e comissões" },
      { name: "Serviços", href: "/gestao/servicos", icon: Heart, description: "Catálogo, preços e duração" },
      { name: "Produtos e estoque", href: "/gestao/produtos", icon: Package, description: "Itens à venda e controle de estoque" },
      { name: "Pacotes", href: "/pacotes", icon: Boxes, description: "Combos de serviços" },
      { name: "Venda de pacotes", href: "/pacotes/vendas", icon: ShoppingCart, description: "Pacotes vendidos aos clientes" },
      { name: "Planos de assinatura", href: "/cadastros/clubes", icon: Crown, description: "Planos mensais para clientes" },
      { name: "Assinantes", href: "/cadastros/assinantes", icon: Users, description: "Quem assina seus planos" },
      { name: "Cupons de desconto", href: "/cadastros/cupons", icon: Ticket, description: "Códigos promocionais" },
      { name: "Categorias e tipos", href: "/cadastros/tipos", icon: Tag, description: "Formas de pagamento, bandeiras, categorias" },
    ],
  },
  {
    name: "Marketing",
    icon: Megaphone,
    roles: GESTAO,
    children: [
      { name: "Mensagens WhatsApp", href: "/mensagens", icon: MessageSquare, description: "Modelos e envios para clientes" },
      { name: "Caixa de entrada", href: "/comunicacao/inbox", icon: Inbox, description: "Mensagens de clientes e sugestões" },
      { name: "E-mail marketing", href: "/comunicacao/email-marketing", icon: Mail, description: "Campanhas por e-mail" },
      { name: "Fidelidade", href: "/clube", icon: Award, description: "Pontos e recompensas" },
      { name: "Avaliações", href: "/avaliacoes", icon: Star, description: "Notas e comentários dos clientes" },
      { name: "Pesquisa de satisfação", href: "/cadastros/pesquisa", icon: ClipboardList, description: "Perguntas após o atendimento" },
      { name: "Grupos de clientes", href: "/cadastros/grupos", icon: UsersRound, description: "Segmentos para mensagens" },
      { name: "Lista de espera", href: "/lista-espera", icon: Clock, description: "Clientes aguardando vaga" },
    ],
  },
  {
    name: "Financeiro",
    icon: DollarSign,
    roles: GESTAO,
    children: [
      { name: "Caixa do dia", href: "/financeiro/caixa", icon: DollarSign, description: "Abrir, movimentar e fechar o caixa" },
      { name: "Histórico de caixas", href: "/financeiro/historico", icon: History, description: "Fechamentos anteriores" },
      { name: "Entradas e saídas", href: "/financeiro/movimentacoes", icon: ArrowUpDown, description: "Lançamentos avulsos" },
      { name: "Contas a pagar e receber", href: "/financeiro", icon: Landmark, description: "Boletos, aluguel, fornecedores" },
      { name: "Comissões", href: "/financeiro/comissoes", icon: Percent, description: "Quanto cada profissional ganhou" },
      { name: "Conta do profissional", href: "/financeiro/conta-profissional", icon: UsersRound, description: "Vales, adiantamentos e acertos" },
      { name: "Fluxo de caixa", href: "/financeiro/fluxo", icon: TrendingUp, description: "Entradas × saídas no período" },
      { name: "Caixinha", href: "/financeiro/caixinha", icon: Wallet, description: "Gorjetas da equipe" },
    ],
  },
  {
    name: "Relatórios",
    icon: BarChart3,
    roles: GESTAO,
    children: [
      { name: "Faturamento e comissões", href: "/relatorios", icon: DollarSign },
      { name: "Resumo do negócio", href: "/relatorios/resumo", icon: Activity },
      { name: "Agendamentos", href: "/relatorios/agendamentos", icon: CalendarDays },
      { name: "Horários de pico", href: "/agenda/picos", icon: Clock },
      { name: "Financeiro", href: "/relatorios/financeiro", icon: TrendingUp },
      { name: "Clientes", href: "/relatorios/perfil-cliente", icon: Users },
      { name: "Aniversariantes", href: "/relatorios/aniversariantes", icon: Gift },
      { name: "Dias sem vir", href: "/relatorios/dias-sem-vir", icon: Clock },
      { name: "Ranking de profissionais", href: "/relatorios/rankings", icon: Star },
      { name: "Lucro por produto", href: "/relatorios/lucro-produtos", icon: Package },
      { name: "Estoque", href: "/relatorios/estoque", icon: Package },
      { name: "Pacotes", href: "/relatorios/pacotes", icon: Boxes },
      { name: "Cupons", href: "/relatorios/cupons", icon: Ticket },
      { name: "Itens de comandas", href: "/relatorios/comandas-itens", icon: FileText },
      { name: "Comandas canceladas", href: "/relatorios/canceladas", icon: ClipboardList },
    ],
  },
  {
    name: "Configurações",
    icon: Settings,
    roles: GESTAO,
    children: [
      { name: "Configurações gerais", href: "/configuracoes", icon: Settings, description: "Agenda, link público, comissões, avisos" },
      { name: "Horários de funcionamento", href: "/configuracoes/funcionamento", icon: Clock, description: "Dias e horários de abertura" },
      { name: "Perfis de acesso", href: "/configuracoes/acessos", icon: Shield, roles: ["dono"], description: "O que cada cargo pode ver" },
      { name: "Modelos de e-mail", href: "/configuracoes/templates", icon: Mail, roles: ["dono"], description: "Textos dos e-mails automáticos" },
    ],
  },
  { name: "Meu estabelecimento", href: "/empresa", icon: Building2, roles: ["dono"], description: "Dados, logo, plano e link de agendamento" },
  { name: "Equipe", href: "/equipe", icon: UsersRound, roles: ["dono"], description: "Convites e acessos da equipe" },
];

/** Âncoras usadas pelo tutorial guiado (data-tutorial). */
export const HREF_TO_TUTORIAL: Record<string, string> = {
  "/dashboard": "dashboard",
  "/agenda": "agenda",
  "/gestao/servicos": "servicos",
  "/gestao/profissionais": "profissionais",
  "/gestao/clientes": "clientes",
  "/comandas/abertas": "comandas",
  "/empresa": "empresa",
  "/configuracoes": "parametros",
};

export const NAV_GROUP_TUTORIAL_IDS: Record<string, string> = {
  "Cadastros": "cadastros-group",
  "Comandas": "comandas-group",
  "Configurações": "configuracoes-group",
  "Financeiro": "financeiro-group",
  "Relatórios": "relatorios-group",
};

/** Mapeia cada rota para a chave de permissão dos Perfis de Acesso. */
export const HREF_TO_PERMISSION: Record<string, string> = {
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
  "/comunicacao/inbox": "mensagens",
  "/comunicacao/email-marketing": "mensagens",
  "/comunicacao/email-marketing/nova": "mensagens",
  "/avaliacoes": "avaliacoes",
  "/clube": "clube",
  "/cadastros/clubes": "clubes_assinatura",
  "/cadastros/assinantes": "clubes_assinatura",
  "/cadastros/grupos": "noticias",
  "/cadastros/pesquisa": "pesquisa",
  "/pacotes": "pacotes",
  "/pacotes/vendas": "venda_pacotes",
  "/comandas/abertas": "comandas",
  "/comandas/historico": "comandas",
  "/caixa": "caixa",
  "/financeiro/caixa": "caixa",
  "/financeiro/historico": "caixa",
  "/financeiro/movimentacoes": "caixa",
  "/financeiro": "financeiro",
  "/financeiro/comissoes": "financeiro",
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
  "/relatorios/perfil-cliente": "relatorios",
  "/relatorios/estoque": "relatorios",
  "/relatorios/pacotes": "relatorios",
  "/relatorios/comandas-itens": "relatorios",
  "/relatorios/dias-sem-vir": "relatorios",
  "/relatorios/lucro-produtos": "relatorios",
  "/relatorios/cupons": "relatorios",
  "/lista-espera": "lista_espera",
  "/configuracoes": "configuracoes",
  "/configuracoes/funcionamento": "configuracoes",
  "/configuracoes/acessos": "configuracoes",
  "/configuracoes/templates": "configuracoes",
  "/empresa": "empresa",
  "/equipe": "equipe",
};

export function hasPermission(href: string | undefined, perms: string[] | null | undefined): boolean {
  if (!perms || !href) return true;
  const key = HREF_TO_PERMISSION[href.split("?")[0]];
  if (!key) return true;
  return perms.includes(key);
}

/** Filtra o menu pelo papel do usuário e pelo perfil de acesso. */
export function filterNav(items: NavItem[], role: string, perms?: string[] | null): NavItem[] {
  return items.reduce<NavItem[]>((acc, item) => {
    if (item.roles && !item.roles.includes(role)) return acc;
    if (item.children) {
      const children = item.children.filter(c => (!c.roles || c.roles.includes(role)) && hasPermission(c.href, perms));
      if (children.length > 0) acc.push({ ...item, children });
      return acc;
    }
    if (hasPermission(item.href, perms)) acc.push(item);
    return acc;
  }, []);
}

function matches(href: string | undefined, location: string): boolean {
  if (!href) return false;
  const loc = location.split("?")[0];
  const h = href.split("?")[0];
  return loc === h || loc.startsWith(h + "/");
}

export function isGroupActive(item: NavItem, location: string): boolean {
  return !!item.children?.some(c => matches(c.href, location));
}

export function isItemActive(href: string | undefined, location: string): boolean {
  if (!href) return false;
  const loc = location.split("?")[0];
  const h = href.split("?")[0];
  // Rotas "raiz" de um grupo (ex.: /financeiro, /relatorios, /configuracoes)
  // só ficam ativas na correspondência exata, senão acendem junto das filhas.
  if (h === "/financeiro" || h === "/relatorios" || h === "/configuracoes") return loc === h;
  return loc === h || loc.startsWith(h + "/");
}
