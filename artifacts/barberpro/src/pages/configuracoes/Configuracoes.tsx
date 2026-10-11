import React, { useEffect, useMemo, useRef, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGetModoHumano, useUpdateModoHumano, getGetModoHumanoQueryKey } from "@workspace/api-client-react";
import { apiUrl } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { renderWhatsappTemplate } from "@/lib/waTemplates";
import { Link } from "wouter";
import {
  CalendarDays, Link2, UsersRound, Receipt, Percent, Award, Bell, MessageCircle, Palette, RotateCcw,
  Check, Loader2, AlertTriangle, ShieldOff, Inbox, MessageSquare, Calendar, DollarSign, Users, Star, Clock,
} from "lucide-react";

type Parametro = { id: number; chave: string; valor: string; tipo: string; label: string; categoria: string; opcoes: string[]; valorPadrao: string };

type ToggleItem = {
  kind: "toggle";
  chave: string;
  titulo: string;
  descricao?: string;
  /** Valor salvo quando ligado / desligado. Padrão "Sim" / "Não". */
  on?: string;
  off?: string;
  requerGoogle?: boolean;
};
type SelectItem = { kind: "select"; chave: string; titulo: string; descricao?: string; opcoes?: { value: string; label: string }[] };
type NumberItem = { kind: "number"; chave: string; titulo: string; descricao?: string; sufixo?: string; min?: number; max?: number; step?: number };
type Item = ToggleItem | SelectItem | NumberItem;

type Secao = { id: string; titulo: string; descricao: string; icon: any; itens?: Item[]; subtitulos?: Record<string, string> };

const SECOES: Secao[] = [
  {
    id: "agenda", titulo: "Agenda", icon: CalendarDays,
    descricao: "Como os horários aparecem e quais limites valem para os agendamentos.",
    itens: [
      { kind: "select", chave: "agenda_modo_confirmacao", titulo: "Confirmação dos agendamentos feitos pelo link", descricao: "Automática confirma na hora. Manual deixa o pedido pendente até alguém aprovar.", opcoes: [
        { value: "Automatica", label: "Automática" }, { value: "Manual_dono", label: "Manual: dono ou gerente aprova" }, { value: "Manual_profissional", label: "Manual: o profissional aprova" },
      ] },
      { kind: "select", chave: "agenda_tamanho_slots", titulo: "Horários oferecidos ao cliente de quanto em quanto tempo", descricao: "Ex.: a cada 30 minutos mostra 9:00, 9:30, 10:00…" },
      { kind: "select", chave: "agenda_tempo_padrao", titulo: "Duração usada quando o serviço não tem tempo definido" },
      { kind: "select", chave: "agenda_limite_antecedencia", titulo: "Antecedência mínima para o cliente agendar", descricao: "Evita agendamentos em cima da hora." },
      { kind: "number", chave: "agenda_limite_futuro_dias", titulo: "Até quantos dias no futuro o cliente pode agendar", sufixo: "dias", min: 1, max: 365 },
      { kind: "number", chave: "agenda_limite_abertos_cliente", titulo: "Máximo de agendamentos futuros por cliente", descricao: "Em aberto ao mesmo tempo.", min: 1, max: 50 },
      { kind: "number", chave: "agenda_limite_diario_mesmo_servico", titulo: "Máximo do mesmo serviço no mesmo dia, por cliente", min: 1, max: 20 },
      { kind: "toggle", chave: "agenda_mesmo_horario_cliente", titulo: "Cliente pode marcar dois serviços no mesmo horário", descricao: "Com profissionais diferentes." },
      { kind: "number", chave: "agenda_limite_passado", titulo: "Quantos dias no passado a equipe pode lançar atendimentos", sufixo: "dias", min: 0, max: 365 },
      { kind: "toggle", chave: "agenda_associar_pacote_auto", titulo: "Usar o pacote do cliente automaticamente", descricao: "Se o cliente tem pacote com o serviço, a sessão é descontada sozinha.", on: "Habilitado", off: "Desabilitado" },
      { kind: "toggle", chave: "agenda_sem_preferencia", titulo: "Mostrar a opção \"Sem preferência\" de profissional" },
      { kind: "toggle", chave: "agenda_categorias_selecao", titulo: "Agrupar profissionais por categoria na escolha" },
    ],
  },
  {
    id: "link", titulo: "Link de agendamento", icon: Link2,
    descricao: "O que o cliente vê e pode fazer na sua página pública.",
    itens: [
      { kind: "select", chave: "agenda_tipo_link", titulo: "Como o cliente agenda", descricao: "Sem cadastro é mais rápido: só nome e WhatsApp. Com cadastro o cliente entra com e-mail ou Google e acompanha tudo pelo app.", opcoes: [
        { value: "Sem login (simples)", label: "Sem cadastro: nome e WhatsApp" }, { value: "Com login", label: "Com cadastro (e-mail ou Google)" },
      ] },
      { kind: "toggle", chave: "cancel_permitir_cliente_link_publico", titulo: "Cliente pode cancelar pelo link" },
      { kind: "number", chave: "cancel_tolerancia_cliente", titulo: "Até quantas horas antes o cliente pode cancelar", sufixo: "horas", min: 0, max: 168 },
      { kind: "toggle", chave: "agenda_whatsapp_encaixe", titulo: "Botão \"Tentar encaixe pelo WhatsApp\"", descricao: "Aparece quando não há horário livre." },
      { kind: "toggle", chave: "outros_mostrar_produtos_app", titulo: "Mostrar seus produtos na página" },
      { kind: "toggle", chave: "cliente_aprovar_cadastro_auto", titulo: "Aprovar cadastro de novos clientes automaticamente", descricao: "Desligado, você aprova cada novo cliente no sino do painel." },
      { kind: "toggle", chave: "cliente_permitir_duplicado_telefone", titulo: "Permitir dois clientes com o mesmo telefone" },
      { kind: "toggle", chave: "app_nao_quero_conversar", titulo: "Mostrar a opção \"Prefiro não conversar durante o atendimento\"", on: "Não", off: "Sim" },
      { kind: "toggle", chave: "notif_cliente_mensagem", titulo: "Chat entre cliente e estabelecimento sobre o agendamento", descricao: "As mensagens chegam na Caixa de entrada.", requerGoogle: true },
    ],
  },
  {
    id: "equipe", titulo: "Permissões da equipe", icon: UsersRound,
    descricao: "O que profissionais (que não são dono nem gerente) podem fazer no painel e no app.",
    itens: [
      { kind: "toggle", chave: "agenda_nao_agendar_profissional", titulo: "Marcar horários na agenda", on: "Não", off: "Sim" },
      { kind: "toggle", chave: "cancel_bloquear_edicao_profissional", titulo: "Editar agendamentos", on: "Não", off: "Sim" },
      { kind: "toggle", chave: "cancel_bloquear_profissional", titulo: "Cancelar agendamentos", on: "Não", off: "Sim" },
      { kind: "toggle", chave: "agenda_alterar_profissional_nao_gestor", titulo: "Trocar o profissional de um agendamento" },
      { kind: "toggle", chave: "agenda_nao_bloquear_profissional", titulo: "Bloquear horários na própria agenda", on: "Não", off: "Sim" },
      { kind: "toggle", chave: "cliente_agendar_sem_cliente", titulo: "Agendar sem informar o cliente", on: "Não", off: "Sim" },
      { kind: "toggle", chave: "cliente_mostrar_lista_app", titulo: "Ver a lista de clientes" },
      { kind: "toggle", chave: "cliente_cadastro_nao_gestor", titulo: "Cadastrar novos clientes" },
      { kind: "toggle", chave: "cliente_nao_mostrar_telefone", titulo: "Ver o telefone dos clientes", on: "Não", off: "Sim" },
      { kind: "toggle", chave: "comanda_abertura_nao_gestor", titulo: "Abrir comandas", on: "Não", off: "Sim" },
      { kind: "toggle", chave: "comanda_fechamento_nao_gestor", titulo: "Fechar comandas" },
      { kind: "toggle", chave: "comanda_reabertura_nao_gestor", titulo: "Reabrir comandas", on: "Não", off: "Sim" },
      { kind: "toggle", chave: "comanda_encaixes_nao_gestor", titulo: "Criar encaixes", on: "Não", off: "Sim" },
      { kind: "toggle", chave: "comanda_somente_envolvidos", titulo: "Ver apenas as comandas em que participam", descricao: "Desligado, veem todas as comandas abertas." },
      { kind: "toggle", chave: "comanda_caixa_profissional_nao_gestor", titulo: "Ver o caixa" },
      { kind: "toggle", chave: "comanda_reabertura_caixa_nao_gestor", titulo: "Reabrir o caixa", on: "Não", off: "Sim" },
    ],
  },
  {
    id: "comandas", titulo: "Comandas e caixa", icon: Receipt,
    descricao: "Regras na hora de cobrar e fechar o dia.",
    itens: [
      { kind: "toggle", chave: "comanda_obrigatoriedade_bandeira", titulo: "Exigir a bandeira ao pagar com cartão", descricao: "Permite calcular taxa e prazo de recebimento." },
      { kind: "toggle", chave: "comanda_edicao_comissoes", titulo: "Permitir ajustar a comissão dentro da comanda", on: "Liberar", off: "Bloquear" },
      { kind: "toggle", chave: "comanda_habilitar_caixinha", titulo: "Caixinha (gorjetas)", descricao: "Mostra o campo de caixinha ao fechar a comanda." },
      { kind: "toggle", chave: "comanda_ver_dia_caixa", titulo: "Botão \"Ver dia\" no caixa", on: "Habilitado", off: "Desabilitado" },
      { kind: "toggle", chave: "comanda_inserir_profissionais_caixa", titulo: "Lançar comandas de profissionais no caixa", descricao: "Para profissionais que pagam a própria comanda (aluguel de cadeira)." },
      { kind: "toggle", chave: "financeiro_baixa_automatica", titulo: "Dar baixa automática em contas a receber no vencimento", on: "Habilitado", off: "Desabilitado" },
    ],
  },
  {
    id: "comissoes", titulo: "Comissões", icon: Percent,
    descricao: "A comissão de cada profissional é definida no cadastro dele. Aqui ficam as regras gerais.",
    itens: [
      { kind: "number", chave: "comissao_produtos_percentual", titulo: "Comissão sobre produtos vendidos na comanda", descricao: "0 = o profissional não ganha comissão em produtos.", sufixo: "%", min: 0, max: 100, step: 0.5 },
      { kind: "toggle", chave: "comissao_nao_gerar_cortesia", titulo: "Não gerar comissão em cortesias" },
      { kind: "toggle", chave: "comissao_nao_gerar_pacote", titulo: "Não comissionar de novo serviços de pacote já comissionados na venda", on: "Habilitado", off: "Desabilitado" },
      { kind: "toggle", chave: "comissao_valor_original_assinatura", titulo: "Nos planos de assinatura, comissionar pelo valor cheio do serviço" },
      { kind: "toggle", chave: "comissao_zerar_fidelidade", titulo: "Zerar a comissão em resgates de fidelidade" },
    ],
  },
  {
    id: "fidelidade", titulo: "Fidelidade", icon: Award,
    descricao: "Pontos que o cliente acumula a cada atendimento. As recompensas ficam em Marketing → Fidelidade.",
    itens: [
      { kind: "toggle", chave: "fidelidade_desativar", titulo: "Programa de fidelidade ativo", on: "Não", off: "Sim" },
      { kind: "number", chave: "fidelidade_expiracao_pontos", titulo: "Pontos expiram após", sufixo: "dias", min: 1, max: 3650 },
      { kind: "toggle", chave: "fidelidade_pontos_app_site", titulo: "Pontuar só agendamentos feitos pelo próprio cliente (link ou app)" },
    ],
  },
  {
    id: "notificacoes", titulo: "Avisos e notificações", icon: Bell,
    descricao: "O que o sistema envia para você, sua equipe e seus clientes.",
    subtitulos: {
      notif_push_agenda: "Para você e sua equipe (notificações no celular)",
      notif_cliente_lembrete_1dia: "Para os clientes (notificações no celular)",
      notif_mensagem_agendar_cancelar: "E-mails e avisos automáticos",
    },
    itens: [
      { kind: "toggle", chave: "notif_push_agenda", titulo: "Agenda", descricao: "Novos agendamentos, cancelamentos, lembretes e pendências." },
      { kind: "toggle", chave: "notif_push_financeiro", titulo: "Financeiro", descricao: "Comandas, contas, sangrias, vales e comissões." },
      { kind: "toggle", chave: "notif_push_equipe", titulo: "Equipe", descricao: "Convites aceitos e mudanças no time." },
      { kind: "toggle", chave: "notif_push_marketing", titulo: "Marketing", descricao: "Avaliações, aniversariantes e campanhas." },
      { kind: "toggle", chave: "notif_push_sistema", titulo: "Sistema", descricao: "Assinatura, cobrança e alertas gerais." },
      { kind: "toggle", chave: "notif_cliente_lembrete_1dia", titulo: "Lembrete 1 dia antes", requerGoogle: true },
      { kind: "toggle", chave: "notif_cliente_lembrete_2h", titulo: "Lembrete 2 horas antes", requerGoogle: true },
      { kind: "toggle", chave: "notif_cliente_lembrete_30min", titulo: "Lembrete 30 minutos antes", requerGoogle: true },
      { kind: "toggle", chave: "notif_mensagem_agendar_cancelar", titulo: "Avisar o cliente quando o agendamento for criado ou cancelado", on: "Habilitado", off: "Desabilitado" },
      { kind: "toggle", chave: "notif_nao_enviar_confirmacao", titulo: "Enviar e-mail de confirmação ao cliente", on: "Não", off: "Sim" },
      { kind: "toggle", chave: "notif_mensagem_gestores", titulo: "Avisar dono e gerentes de novos agendamentos e cancelamentos", on: "Habilitado", off: "Desabilitado" },
      { kind: "number", chave: "notif_tempo_lembrete", titulo: "Lembrete de horário: quantas horas antes", sufixo: "horas", min: 1, max: 168 },
      { kind: "toggle", chave: "notif_link_confirmacao", titulo: "Incluir link de confirmação de presença no lembrete" },
      { kind: "toggle", chave: "notif_aniversario_email", titulo: "Parabéns por e-mail no aniversário do cliente" },
      { kind: "toggle", chave: "notif_aniversario_app", titulo: "Parabéns por notificação no app" },
      { kind: "toggle", chave: "notif_pacote_expirando", titulo: "Avisar o cliente quando o pacote estiver vencendo" },
      { kind: "toggle", chave: "avaliacao_individual", titulo: "Avaliações separadas por profissional", descricao: "Mostra a nota de cada profissional na página de avaliações." },
    ],
  },
  {
    id: "whatsapp", titulo: "Mensagens de WhatsApp", icon: MessageCircle,
    descricao: "Textos prontos que você envia com um toque. Os campos entre chaves são preenchidos automaticamente.",
  },
  {
    id: "aparencia", titulo: "Aparência e geral", icon: Palette,
    descricao: "Preferências do painel.",
    itens: [
      { kind: "select", chave: "tema_layout", titulo: "Modo de exibição", opcoes: [
        { value: "Claro", label: "Claro" }, { value: "Escuro", label: "Escuro" }, { value: "Automático", label: "Automático (segue o aparelho)" },
      ] },
      { kind: "select", chave: "outros_fuso_horario", titulo: "Fuso horário", descricao: "Usado para calcular horários e lembretes." },
    ],
  },
];

const PUSH_ICONS: Record<string, any> = { notif_push_agenda: Calendar, notif_push_financeiro: DollarSign, notif_push_equipe: Users, notif_push_marketing: Star, notif_push_sistema: AlertTriangle };

const WA_TEMPLATES: { chave: string; titulo: string; quando: string }[] = [
  { chave: "whatsapp_template_confirmacao", titulo: "Confirmação de agendamento", quando: "Botão de WhatsApp ao confirmar um horário" },
  { chave: "whatsapp_template_recusa", titulo: "Recusa de agendamento", quando: "Quando você recusa um pedido pendente" },
  { chave: "whatsapp_template_lembrete", titulo: "Lembrete de horário", quando: "Na agenda e em Lembretes" },
  { chave: "whatsapp_template_posatendimento", titulo: "Pós-atendimento", quando: "Depois de fechar a comanda" },
  { chave: "whatsapp_template_aniversario", titulo: "Aniversário", quando: "No relatório de aniversariantes" },
  { chave: "whatsapp_template_recuperacao", titulo: "Cliente sumido", quando: "No relatório Dias sem vir" },
];

const WA_VARIABLES: Array<{ key: string; label: string; sample: string }> = [
  { key: "cliente", label: "Nome do cliente", sample: "Maria Silva" },
  { key: "servico", label: "Serviço", sample: "Corte + Escova" },
  { key: "data", label: "Data", sample: "25/04/2026" },
  { key: "hora", label: "Hora", sample: "14:30" },
  { key: "profissional", label: "Profissional", sample: "Ana" },
  { key: "estabelecimento", label: "Seu estabelecimento", sample: "Studio Glow" },
  { key: "valor", label: "Valor", sample: "R$ 80,00" },
];
const SAMPLE_VARS = Object.fromEntries(WA_VARIABLES.map(v => [v.key, v.sample]));

function useParametros(barbeariaId: number | null | undefined) {
  return useQuery<Parametro[]>({
    queryKey: ["parametros", barbeariaId],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/parametros`), { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao carregar configurações");
      return res.json();
    },
    enabled: !!barbeariaId,
  });
}

export default function Configuracoes() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: parametros = [], isLoading } = useParametros(barbeariaId);
  const [salvando, setSalvando] = useState<Record<string, "salvando" | "ok">>({});
  const [ativa, setAtiva] = useState<string>(() => new URLSearchParams(window.location.search).get("secao") || "agenda");

  const mapa = useMemo(() => {
    const m: Record<string, Parametro> = {};
    for (const p of parametros) m[p.chave] = p;
    return m;
  }, [parametros]);

  const { data: googleData } = useQuery<{ clientId: string }>({
    queryKey: ["google-client-id"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/lgpd/google-client-id"), { credentials: "include" });
      if (!res.ok) return { clientId: "" };
      return res.json();
    },
  });
  const googleOk = !!(googleData?.clientId?.trim());

  const salvar = useMutation({
    mutationFn: async ({ chave, valor }: { chave: string; valor: string }) => {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/parametros/${encodeURIComponent(chave)}`), {
        method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ valor }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Não foi possível salvar");
      }
      return res.json();
    },
    onMutate: async ({ chave, valor }) => {
      setSalvando(s => ({ ...s, [chave]: "salvando" }));
      await qc.cancelQueries({ queryKey: ["parametros", barbeariaId] });
      const anterior = qc.getQueryData<Parametro[]>(["parametros", barbeariaId]);
      qc.setQueryData<Parametro[]>(["parametros", barbeariaId], (old = []) => old.map(p => p.chave === chave ? { ...p, valor } : p));
      return { anterior };
    },
    onError: (err: any, vars, ctx) => {
      if (ctx?.anterior) qc.setQueryData(["parametros", barbeariaId], ctx.anterior);
      setSalvando(s => { const n = { ...s }; delete n[vars.chave]; return n; });
      toast({ title: "Não foi possível salvar", description: err.message, variant: "destructive" });
    },
    onSuccess: (_d, vars) => {
      setSalvando(s => ({ ...s, [vars.chave]: "ok" }));
      setTimeout(() => setSalvando(s => { const n = { ...s }; delete n[vars.chave]; return n; }), 1500);
      qc.invalidateQueries({ queryKey: ["parametros-layout"] });
      qc.invalidateQueries({ queryKey: ["whatsapp-templates"] });
      if (vars.chave === "tema_layout") aplicarModo(vars.valor);
    },
  });

  const restaurar = useMutation({
    mutationFn: async (chave: string) => {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/parametros/${encodeURIComponent(chave)}`), { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Não foi possível restaurar");
      return res.json();
    },
    onSuccess: (_d, chave) => {
      qc.invalidateQueries({ queryKey: ["parametros"] });
      qc.invalidateQueries({ queryKey: ["parametros-layout"] });
      qc.invalidateQueries({ queryKey: ["whatsapp-templates"] });
      const def = mapa[chave]?.valorPadrao;
      if (chave === "tema_layout" && def) aplicarModo(def);
    },
    onError: () => toast({ title: "Não foi possível restaurar o padrão", variant: "destructive" }),
  });

  function aplicarModo(modo: string) {
    const html = document.documentElement;
    html.classList.remove("dark");
    if (modo === "Escuro") html.classList.add("dark");
    else if (modo === "Automático" && window.matchMedia("(prefers-color-scheme: dark)").matches) html.classList.add("dark");
  }

  function irPara(id: string) {
    setAtiva(id);
    const el = document.getElementById(`secao-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    if (isLoading) return;
    const el = document.getElementById(`secao-${ativa}`);
    if (el && ativa !== "agenda") el.scrollIntoView({ block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const secoesVisiveis = SECOES;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-5">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground mt-1 text-sm">Tudo aqui é salvo na hora, sem botão de salvar. Horários de abertura ficam em <Link href="/configuracoes/funcionamento" className="text-primary underline underline-offset-2">Funcionamento</Link>.</p>
        </div>

        <div className="md:hidden -mx-3 px-3 mb-4 overflow-x-auto">
          <div className="flex gap-2 w-max">
            {secoesVisiveis.map(s => (
              <button key={s.id} onClick={() => irPara(s.id)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition ${ativa === s.id ? "bg-foreground text-background border-foreground" : "bg-card border-border text-foreground/70"}`}>
                {s.titulo}
              </button>
            ))}
          </div>
        </div>

        <div className="md:grid md:grid-cols-[220px_1fr] md:gap-8 items-start">
          <nav className="hidden md:block sticky top-4 space-y-0.5">
            {secoesVisiveis.map(s => (
              <button key={s.id} onClick={() => irPara(s.id)} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-left transition ${ativa === s.id ? "bg-foreground text-background font-medium" : "text-foreground/60 hover:bg-muted hover:text-foreground"}`}>
                <s.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{s.titulo}</span>
              </button>
            ))}
          </nav>

          <div className="space-y-6 min-w-0">
            {isLoading ? (
              <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-40 bg-card rounded-2xl animate-pulse" />)}</div>
            ) : secoesVisiveis.map(secao => (
              <section key={secao.id} id={`secao-${secao.id}`} className="scroll-mt-4 bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-4 sm:px-5 py-4 border-b border-border flex items-start gap-3">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><secao.icon className="h-4.5 w-4.5" /></div>
                  <div className="min-w-0">
                    <h2 className="font-semibold text-[15px]">{secao.titulo}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{secao.descricao}</p>
                  </div>
                </div>

                {secao.id === "notificacoes" && <ModoHumanoCard />}
                {secao.id === "notificacoes" && !googleOk && (
                  <div className="mx-4 sm:mx-5 mt-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-800 dark:text-amber-200">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>Os avisos para clientes dependem do login com Google na página de agendamento. Enquanto ele não estiver configurado, essas opções ficam desligadas.</span>
                  </div>
                )}

                {secao.id === "whatsapp" ? (
                  <WhatsappSection mapa={mapa} onSave={(chave, valor) => salvar.mutate({ chave, valor })} onReset={(chave) => restaurar.mutate(chave)} status={salvando} />
                ) : (
                  <div className="divide-y divide-border">
                    {(secao.itens || []).map(item => {
                      const p = mapa[item.chave];
                      if (!p) return null;
                      const subtitulo = secao.subtitulos?.[item.chave];
                      return (
                        <React.Fragment key={item.chave}>
                          {subtitulo && <p className="px-4 sm:px-5 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{subtitulo}</p>}
                          <Linha item={item} p={p} status={salvando[item.chave]} googleOk={googleOk} icon={PUSH_ICONS[item.chave]}
                            onChange={(valor) => salvar.mutate({ chave: item.chave, valor })}
                            onReset={() => restaurar.mutate(item.chave)} />
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}
              </section>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function Linha({ item, p, status, googleOk, icon: Icon, onChange, onReset }: {
  item: Item; p: Parametro; status?: "salvando" | "ok"; googleOk: boolean; icon?: any; onChange: (valor: string) => void; onReset: () => void;
}) {
  const alterado = p.valor !== p.valorPadrao;
  const bloqueado = item.kind === "toggle" && item.requerGoogle && !googleOk;

  return (
    <div className={`flex items-center gap-3 px-4 sm:px-5 py-3 ${bloqueado ? "opacity-50" : ""}`}>
      {Icon && <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0"><Icon className="h-4 w-4 text-foreground/60" /></div>}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug">{item.titulo}</p>
        {item.descricao && <p className="text-xs text-muted-foreground mt-0.5">{item.descricao}</p>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="w-4 flex justify-center">
          {status === "salvando" && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          {status === "ok" && <Check className="h-3.5 w-3.5 text-emerald-500" />}
        </span>
        {item.kind === "toggle" && (
          <Switch
            checked={p.valor === (item.on ?? "Sim")}
            disabled={bloqueado}
            onCheckedChange={(v) => onChange(v ? (item.on ?? "Sim") : (item.off ?? "Não"))}
          />
        )}
        {item.kind === "select" && (
          <select
            value={p.valor}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 max-w-[200px] sm:max-w-[260px] rounded-lg border border-border bg-background px-2 text-[13px] text-foreground"
          >
            {(item.opcoes ?? p.opcoes.map(o => ({ value: o, label: o }))).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            {!(item.opcoes ?? p.opcoes.map(o => ({ value: o }))).some(o => o.value === p.valor) && <option value={p.valor}>{p.valor}</option>}
          </select>
        )}
        {item.kind === "number" && <NumeroInput item={item} valor={p.valor} onChange={onChange} />}
        {alterado && (
          <button type="button" onClick={onReset} title={`Voltar ao padrão (${p.valorPadrao})`} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted">
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function NumeroInput({ item, valor, onChange }: { item: NumberItem; valor: string; onChange: (v: string) => void }) {
  const [local, setLocal] = useState(valor);
  useEffect(() => { setLocal(valor); }, [valor]);
  const commit = () => {
    const limpo = local.trim().replace(",", ".");
    if (limpo === "" || limpo === valor) { setLocal(valor); return; }
    let n = Number(limpo);
    if (Number.isNaN(n)) { setLocal(valor); return; }
    if (item.min != null) n = Math.max(item.min, n);
    if (item.max != null) n = Math.min(item.max, n);
    const texto = String(n);
    setLocal(texto);
    if (texto !== valor) onChange(texto);
  };
  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="number" inputMode="decimal" value={local} min={item.min} max={item.max} step={item.step ?? 1}
        onChange={(e) => setLocal(e.target.value)} onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur(); }}
        className="h-9 w-[84px] rounded-lg text-[13px] text-right"
      />
      {item.sufixo && <span className="text-xs text-muted-foreground w-10">{item.sufixo}</span>}
    </div>
  );
}

function ModoHumanoCard() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data } = useGetModoHumano(barbeariaId!, { query: { enabled: !!barbeariaId } } as any);
  const update = useUpdateModoHumano();
  const ativo = !!(data as any)?.modoHumano;

  async function toggle(checked: boolean) {
    try {
      await update.mutateAsync({ barbeariaId: barbeariaId!, data: { modoHumano: checked } });
      qc.invalidateQueries({ queryKey: getGetModoHumanoQueryKey(barbeariaId!) });
      toast({ title: checked ? "Modo humano ativado" : "Modo humano desativado", description: checked ? "Confirmações, lembretes e aniversários vão para a Caixa de entrada para você enviar." : "Os envios automáticos voltaram." });
    } catch (err: any) {
      toast({ title: "Erro", description: err?.data?.error || err?.message || "Falha ao atualizar", variant: "destructive" });
    }
  }

  return (
    <div className={`mx-4 sm:mx-5 mt-4 rounded-xl border p-4 ${ativo ? "border-yellow-500/40 bg-yellow-500/5" : "border-border bg-muted/30"}`}>
      <div className="flex items-start gap-3">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${ativo ? "bg-yellow-500/20 text-yellow-600" : "bg-muted text-muted-foreground"}`}><ShieldOff className="h-4.5 w-4.5" /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm">Modo humano</p>
            {ativo && <Badge variant="secondary" className="text-[10px] bg-yellow-500/20 text-yellow-700">Ativo</Badge>}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Nada sai automaticamente: confirmações, lembretes e parabéns viram sugestões na <Link href="/comunicacao/inbox" className="underline">Caixa de entrada</Link> para você mandar com seu toque.</p>
          <div className="flex gap-2 mt-2">
            <Link href="/comunicacao/inbox" className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border border-border hover:bg-muted"><Inbox className="h-3 w-3" /> Caixa de entrada</Link>
            <Link href="/mensagens" className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border border-border hover:bg-muted"><MessageSquare className="h-3 w-3" /> Modelos</Link>
          </div>
        </div>
        <Switch checked={ativo} onCheckedChange={toggle} disabled={update.isPending || !data} />
      </div>
    </div>
  );
}

function WhatsappSection({ mapa, onSave, onReset, status }: { mapa: Record<string, Parametro>; onSave: (chave: string, valor: string) => void; onReset: (chave: string) => void; status: Record<string, "salvando" | "ok"> }) {
  return (
    <div className="p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className="mr-1">Campos automáticos:</span>
        {WA_VARIABLES.map(v => <span key={v.key} className="px-1.5 py-0.5 rounded bg-muted font-mono" title={v.label}>{`{{${v.key}}}`}</span>)}
      </div>
      {WA_TEMPLATES.map(t => {
        const p = mapa[t.chave];
        if (!p) return null;
        return <TemplateEditor key={t.chave} p={p} titulo={t.titulo} quando={t.quando} status={status[t.chave]} onSave={(v) => onSave(t.chave, v)} onReset={() => onReset(t.chave)} />;
      })}
    </div>
  );
}

function TemplateEditor({ p, titulo, quando, status, onSave, onReset }: { p: Parametro; titulo: string; quando: string; status?: "salvando" | "ok"; onSave: (v: string) => void; onReset: () => void }) {
  const [texto, setTexto] = useState(p.valor);
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => { setTexto(p.valor); }, [p.valor]);
  const alterado = texto !== p.valor;

  const inserir = (key: string) => {
    const token = `{{${key}}}`;
    const ta = ref.current;
    if (ta && typeof ta.selectionStart === "number") {
      const start = ta.selectionStart, end = ta.selectionEnd;
      const next = texto.slice(0, start) + token + texto.slice(end);
      setTexto(next);
      requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(start + token.length, start + token.length); });
    } else setTexto(texto + token);
  };

  return (
    <div className="rounded-xl border border-border p-3 sm:p-4 space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{titulo}</p>
          <p className="text-[11px] text-muted-foreground">{quando}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {status === "salvando" && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          {status === "ok" && <Check className="h-3.5 w-3.5 text-emerald-500" />}
          {p.valor !== p.valorPadrao && (
            <button type="button" onClick={onReset} title="Voltar ao texto padrão" className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"><RotateCcw className="h-3.5 w-3.5" /></button>
          )}
        </div>
      </div>
      <Textarea ref={ref} value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} className="text-[13px] leading-relaxed" />
      <div className="flex flex-wrap gap-1">
        {WA_VARIABLES.map(v => (
          <button key={v.key} type="button" onClick={() => inserir(v.key)} className="px-2 py-0.5 rounded-md bg-muted hover:bg-muted/70 text-[11px] text-foreground/70">+ {v.label.toLowerCase()}</button>
        ))}
      </div>
      <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
        <p className="text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300 font-semibold mb-0.5">Como o cliente vai receber</p>
        <p className="text-[12.5px] whitespace-pre-wrap leading-relaxed">{renderWhatsappTemplate(texto, SAMPLE_VARS) || <span className="italic text-muted-foreground">Mensagem vazia</span>}</p>
      </div>
      {alterado && (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" className="h-8" onClick={() => setTexto(p.valor)}>Descartar</Button>
          <Button size="sm" className="h-8" onClick={() => onSave(texto)}>Salvar texto</Button>
        </div>
      )}
    </div>
  );
}
