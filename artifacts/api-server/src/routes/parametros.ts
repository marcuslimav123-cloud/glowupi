import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { parametrosConfigTable, barbeariasTable } from "@workspace/db/schema";
import { inArray, eq, and } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth.js";

const router: IRouter = Router({ mergeParams: true });

async function resolveUserBarbeariaId(user: { id: number; role: string; barbeariaId: number | null }): Promise<number | null> {
  if (user.barbeariaId) return user.barbeariaId;
  if (user.role === "dono") {
    const [b] = await db.select({ id: barbeariasTable.id }).from(barbeariasTable).where(eq(barbeariasTable.donoId, user.id)).limit(1);
    return b?.id ?? null;
  }
  return null;
}

export type ParamDef = {
  chave: string;
  label: string;
  categoria: string;
  tipo: "select" | "input";
  opcoes?: string[];
  valorPadrao: string;
};

export const PARAMETROS_DEFAULTS: ParamDef[] = [
  { chave: "fidelidade_expiracao_pontos", label: "Dias para data de expiração de pontos", categoria: "Fidelidade & Pontos", tipo: "input", valorPadrao: "365" },
  { chave: "cancel_tolerancia_cliente", label: "Limite de tolerância de cancelamento de horário pelo cliente (app)", categoria: "Cancelamentos & Tolerância", tipo: "input", valorPadrao: "2" },
  { chave: "agenda_tempo_padrao", label: "Intervalo da agenda (granularidade dos slots)", categoria: "Agenda & Agendamentos", tipo: "select", opcoes: ["5 minutos", "10 minutos", "15 minutos", "20 minutos", "30 minutos"], valorPadrao: "30 minutos" },
  { chave: "tema_layout", label: "Tema/Layout WebAdmin", categoria: "Aparência", tipo: "select", opcoes: ["Claro", "Escuro", "Automático"], valorPadrao: "Claro" },
  { chave: "menu_modo", label: "Menu do painel (Essencial mostra só o dia a dia; Completo mostra todos os recursos)", categoria: "Aparência", tipo: "select", opcoes: ["Essencial", "Completo"], valorPadrao: "Essencial" },
  { chave: "agenda_limite_antecedencia", label: "Limite de antecedência para agendamento de horário pelo App", categoria: "Agenda & Agendamentos", tipo: "select", opcoes: ["Sem limite", "1 hora", "2 horas", "3 horas", "4 horas", "6 horas", "12 horas", "24 horas"], valorPadrao: "Sem limite" },
  { chave: "notif_mensagem_agendar_cancelar", label: "Habilitar envio de mensagem quando agendar/cancelar pelo aplicativo", categoria: "Notificações & Mensagens", tipo: "select", opcoes: ["Habilitado", "Desabilitado"], valorPadrao: "Habilitado" },
  { chave: "agenda_mesmo_horario_cliente", label: "Permitir agendamento no mesmo horário pelo cliente (Aplicativo)", categoria: "Agenda & Agendamentos", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Sim" },
  { chave: "comanda_obrigatoriedade_bandeira", label: "Obrigatoriedade da seleção de bandeira na comanda e na venda de pacotes", categoria: "Comandas & Caixa", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "agenda_limite_futuro_dias", label: "Limite de agendamento futuro pelo cliente (em dias)", categoria: "Agenda & Agendamentos", tipo: "input", valorPadrao: "365" },
  { chave: "cancel_permitir_cliente_link_publico", label: "Permitir cancelamento pelo cliente no link público", categoria: "Cancelamentos & Tolerância", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Sim" },
  { chave: "cancel_bloquear_profissional", label: "Não deixar cancelar horários (Profissional não-gestor)", categoria: "Cancelamentos & Tolerância", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "cliente_aprovar_cadastro_auto", label: "Aprovar solicitação de cadastro automaticamente", categoria: "Clientes & Cadastro", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Sim" },
  { chave: "comanda_somente_envolvidos", label: "No aplicativo, mostrar comandas abertas SOMENTE para profissionais envolvidos e gestores", categoria: "Comandas & Caixa", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Sim" },
  { chave: "comanda_fechamento_nao_gestor", label: "Habilitar fechamento de comanda no aplicativo para usuários não-gestores", categoria: "Comandas & Caixa", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "comanda_inserir_profissionais_caixa", label: "Permitir inserção de comandas de profissionais no caixa (para profissionais que pagam comandas)", categoria: "Comandas & Caixa", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Sim" },
  { chave: "comanda_edicao_comissoes", label: "Campo de edição de comissões na comanda", categoria: "Comandas & Caixa", tipo: "select", opcoes: ["Bloquear", "Liberar"], valorPadrao: "Liberar" },
  { chave: "agenda_nao_agendar_profissional", label: "Não deixar agendar horários pelo App profissionais não-gestor", categoria: "Agenda & Agendamentos", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "financeiro_baixa_automatica", label: "Ativar baixa automática do contas a receber quando chegar o vencimento", categoria: "Financeiro", tipo: "select", opcoes: ["Habilitado", "Desabilitado"], valorPadrao: "Desabilitado" },
  { chave: "cliente_controle_celular", label: "Ativar controle de clientes por número de celular (legado)", categoria: "Clientes & Cadastro", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "cliente_permitir_duplicado_telefone", label: "Permitir cadastrar clientes com o mesmo telefone (admin)", categoria: "Clientes & Cadastro", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "notif_tempo_lembrete", label: "Tempo (em horas) para envio de lembrete automático para agendamentos feitos pelo aplicativo", categoria: "Notificações & Mensagens", tipo: "input", valorPadrao: "24" },
  { chave: "fonte_webadmin", label: "Fonte WebAdmin", categoria: "Aparência", tipo: "select", opcoes: ["Inter", "Quicksand", "Mulish", "Dosis", "Didact Gothic"], valorPadrao: "Inter" },
  { chave: "fidelidade_pontos_app_site", label: "Contabilizar pontos no programa de fidelidade apenas para agendamentos feitos pelo App/Site pelo cliente", categoria: "Fidelidade & Pontos", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "notif_lembrete_sms", label: "Ativar envio automático de lembrete via SMS para agendamentos pelo aplicativo (caso tenha saldo de SMS)", categoria: "Notificações & Mensagens", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "notif_aniversario_app", label: "Envio automático de mensagens de aniversário via notificação no aplicativo", categoria: "Notificações & Mensagens", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "cliente_nao_mostrar_telefone", label: "Não mostrar telefone do cliente no aplicativo e agendamentos do ChatBot para usuários não-gestores", categoria: "Clientes & Cadastro", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "agenda_limite_passado", label: "Limite de dias para agendamento passado", categoria: "Agenda & Agendamentos", tipo: "input", valorPadrao: "7" },
  { chave: "cliente_mostrar_lista_app", label: "Mostrar lista de clientes no App para usuários não-gestores", categoria: "Clientes & Cadastro", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Sim" },
  { chave: "cliente_cadastro_nao_gestor", label: "Permitir o cadastro de novo cliente no App para usuários não-gestores", categoria: "Clientes & Cadastro", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Sim" },
  { chave: "agenda_alterar_profissional_nao_gestor", label: "Habilitar alteração de profissional da agenda do App para usuários não-gestores", categoria: "Agenda & Agendamentos", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "notif_nao_enviar_confirmacao", label: "Não enviar emails de confirmação de agendamento para o cliente", categoria: "Notificações & Mensagens", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "comanda_reabertura_caixa_nao_gestor", label: "Não permitir a reabertura de caixa por profissionais não-gestores", categoria: "Comandas & Caixa", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "comanda_reabertura_nao_gestor", label: "Não permitir a reabertura de comandas por profissionais não-gestores", categoria: "Comandas & Caixa", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "notif_link_confirmacao", label: "Enviar link de confirmação de agendamento para o cliente no lembrete via Email, SMS e WhatsApp", categoria: "Notificações & Mensagens", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Sim" },
  { chave: "agenda_nao_bloquear_profissional", label: "Não deixar bloquear horários pelo App profissional não-gestor", categoria: "Agenda & Agendamentos", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "outros_habilitar_auxiliar", label: "Habilitar configuração de auxiliar", categoria: "Outros", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "notif_aniversario_sms", label: "Ativar envio automático de mensagens de aniversário via SMS (caso tenha saldo de SMS)", categoria: "Notificações & Mensagens", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "notif_retorno_sms", label: "Ativar envio automático de mensagens de retorno via SMS (caso tenha saldo de SMS)", categoria: "Notificações & Mensagens", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "outros_jornada_profissional_servico", label: "Ativar controle jornada × profissional × serviço", categoria: "Outros", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "agenda_sem_preferencia", label: "Mostrar opção do 'sem preferência' na lista de profissionais", categoria: "Agenda & Agendamentos", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Sim" },
  { chave: "notif_mensagem_gestores", label: "Habilitar envio de mensagem quando agendar/cancelar pelo aplicativo para todos os gestores", categoria: "Notificações & Mensagens", tipo: "select", opcoes: ["Habilitado", "Desabilitado"], valorPadrao: "Habilitado" },
  { chave: "agenda_associar_pacote_auto", label: "Habilitar associação automática do pacote ao agendamento", categoria: "Agenda & Agendamentos", tipo: "select", opcoes: ["Habilitado", "Desabilitado"], valorPadrao: "Habilitado" },
  { chave: "comanda_habilitar_caixinha", label: "Habilitar caixinha", categoria: "Comandas & Caixa", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "comanda_ver_dia_caixa", label: "Mostrar VER DIA no caixa", categoria: "Comandas & Caixa", tipo: "select", opcoes: ["Habilitado", "Desabilitado"], valorPadrao: "Habilitado" },
  { chave: "comissao_zerar_fidelidade", label: "Zerar comissão ao realizar resgate do programa de fidelidade", categoria: "Comissões", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "cliente_agendar_sem_cliente", label: "Não permitir agendamento sem cliente por profissionais não-gestores", categoria: "Clientes & Cadastro", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "comanda_encaixes_nao_gestor", label: "Não permitir a criação de encaixes por profissionais não-gestores", categoria: "Comandas & Caixa", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "comissao_nao_gerar_pacote", label: "Não gerar comissão na comanda para serviços associados a pacotes comissionados", categoria: "Comissões", tipo: "select", opcoes: ["Habilitado", "Desabilitado"], valorPadrao: "Habilitado" },
  { chave: "notif_lembrete_whatsapp", label: "Ativar envio automático de lembrete via WhatsApp para agendamentos (caso tenha saldo de WhatsApp)", categoria: "Notificações & Mensagens", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "agenda_limite_diario_mesmo_servico", label: "Limite de agendamento diários para o cliente (Mesmo serviço)", categoria: "Agenda & Agendamentos", tipo: "input", valorPadrao: "3" },
  { chave: "outros_fuso_horario", label: "Fuso horário", categoria: "Outros", tipo: "select", opcoes: ["America/Sao_Paulo", "America/Manaus", "America/Bahia", "America/Recife", "America/Fortaleza", "America/Cuiaba", "America/Porto_Velho", "America/Rio_Branco", "America/Belem"], valorPadrao: "America/Sao_Paulo" },
  { chave: "outros_mostrar_produtos_app", label: "Mostrar produtos no App Cliente/Site", categoria: "Outros", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Sim" },
  { chave: "notif_retorno_whatsapp", label: "Ativar envio automático de mensagens de retorno via WhatsApp (caso tenha saldo de WhatsApp)", categoria: "Notificações & Mensagens", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "notif_aniversario_whatsapp", label: "Ativar envio automático de aniversário via WhatsApp (caso tenha saldo de WhatsApp)", categoria: "Notificações & Mensagens", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "fidelidade_desativar", label: "Desativar programa de fidelidade", categoria: "Fidelidade & Pontos", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "agenda_horario_inicio", label: "Início de horário da agenda do WebAdmin/App PRO", categoria: "Agenda & Agendamentos", tipo: "input", valorPadrao: "08:00" },
  { chave: "comanda_caixa_profissional_nao_gestor", label: "Mostrar caixa no App Pro para profissionais não-gestores", categoria: "Comandas & Caixa", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "comissao_valor_original_assinatura", label: "Nos agendamentos do clube de assinatura, gerar comissão com base no valor original do serviço (Sem desconto)", categoria: "Comissões", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "comissao_produtos_percentual", label: "Comissão sobre produtos vendidos na comanda (%). Em branco = usa a porcentagem do profissional", categoria: "Comissões", tipo: "input", valorPadrao: "" },
  { chave: "comissao_nao_gerar_cortesia", label: "Não gerar comissões para itens que forem cortesias", categoria: "Comissões", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Sim" },
  { chave: "agenda_tamanho_slots", label: "Tamanho dos slots da agenda no Web", categoria: "Agenda & Agendamentos", tipo: "select", opcoes: ["15 minutos", "30 minutos", "45 minutos", "60 minutos"], valorPadrao: "30 minutos" },
  { chave: "agenda_limite_abertos_cliente", label: "Limite de agendamentos futuros em aberto por cliente", categoria: "Agenda & Agendamentos", tipo: "input", valorPadrao: "5" },
  { chave: "notif_aniversario_email", label: "Ativar envio automático de aniversário via Email", categoria: "Notificações & Mensagens", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "agenda_horario_fim", label: "Final dos horários na agenda do WebAdmin", categoria: "Agenda & Agendamentos", tipo: "input", valorPadrao: "20:00" },
  { chave: "notif_pacote_expirando", label: "Enviar notificação no aplicativo quando o cliente estiver com pacote expirando", categoria: "Notificações & Mensagens", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Sim" },
  { chave: "cancel_bloquear_edicao_profissional", label: "Bloquear edição de agendamento para profissionais não-gestores", categoria: "Cancelamentos & Tolerância", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "notif_avaliacao_whatsapp", label: "Ativar envio automático de avaliação do atendimento via WhatsApp (caso tenha saldo de WhatsApp)", categoria: "Notificações & Mensagens", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "comanda_abertura_nao_gestor", label: "Não permitir abertura de comanda por profissionais não gestores", categoria: "Comandas & Caixa", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "agenda_categorias_selecao", label: "Mostrar lista de categorias para seleção de profissionais na agenda", categoria: "Agenda & Agendamentos", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "app_nao_quero_conversar", label: "Não mostrar opção de 'Não quero conversar...' no app", categoria: "Outros", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "assinatura_dias_semana", label: "Mostrar opção de assinatura por dias da semana", categoria: "Outros", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "avaliacao_individual", label: "Mostrar avaliação individual dos profissionais", categoria: "Outros", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "agenda_tipo_link", label: "Tipo de link de agendamento", categoria: "Agenda & Agendamentos", tipo: "select", opcoes: ["Com login", "Sem login (simples)"], valorPadrao: "Com login" },
  { chave: "agenda_whatsapp_encaixe", label: "Mostrar botão 'Tentar encaixe via WhatsApp' no link público de agendamento", categoria: "Agenda & Agendamentos", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "notif_push_agenda", label: "Receber push de Agenda (novos agendamentos, cancelamentos, lembretes)", categoria: "Notificações Push (Equipe)", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Sim" },
  { chave: "notif_push_financeiro", label: "Receber push de Financeiro (comandas, contas, sangrias, vales, comissões)", categoria: "Notificações Push (Equipe)", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Sim" },
  { chave: "notif_push_equipe", label: "Receber push de Equipe (convites aceitos e mudanças no time)", categoria: "Notificações Push (Equipe)", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Sim" },
  { chave: "notif_push_marketing", label: "Receber push de Marketing (avaliações, aniversariantes, campanhas)", categoria: "Notificações Push (Equipe)", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Sim" },
  { chave: "notif_push_sistema", label: "Receber push do Sistema (status da assinatura, cobrança, alertas)", categoria: "Notificações Push (Equipe)", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Sim" },
  { chave: "notif_cliente_lembrete_1dia", label: "Enviar lembrete push para clientes 1 dia antes do agendamento", categoria: "Notificações para Clientes", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "notif_cliente_lembrete_2h", label: "Enviar lembrete push para clientes 2 horas antes do agendamento", categoria: "Notificações para Clientes", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "notif_cliente_lembrete_30min", label: "Enviar lembrete push para clientes 30 minutos antes do agendamento", categoria: "Notificações para Clientes", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "notif_cliente_mensagem", label: "Habilitar canal de mensagens entre clientes e o estabelecimento (agendamentos)", categoria: "Notificações para Clientes", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "agenda_modo_confirmacao", label: "Modo de confirmação de agendamentos", categoria: "Agenda & Agendamentos", tipo: "select", opcoes: ["Automatica", "Manual_dono", "Manual_profissional"], valorPadrao: "Automatica" },
  { chave: "whatsapp_template_confirmacao", label: "Template WhatsApp — Confirmação de agendamento", categoria: "Templates WhatsApp", tipo: "input", valorPadrao: "Olá {{cliente}}! Seu agendamento de {{servico}} com {{profissional}} no dia {{data}} às {{hora}} foi CONFIRMADO. Te esperamos no(a) {{estabelecimento}}!" },
  { chave: "whatsapp_template_recusa", label: "Template WhatsApp — Recusa de agendamento", categoria: "Templates WhatsApp", tipo: "input", valorPadrao: "Olá {{cliente}}, infelizmente não conseguimos confirmar seu agendamento de {{servico}} no dia {{data}} às {{hora}}. Por favor, escolha outro horário. Obrigado(a) — {{estabelecimento}}" },
  { chave: "whatsapp_template_recuperacao", label: "Template WhatsApp — Recuperação de cliente inativo", categoria: "Templates WhatsApp", tipo: "input", valorPadrao: "Olá {{cliente}}! Sentimos sua falta no(a) {{estabelecimento}}. Que tal agendar um horário para voltar a se cuidar?" },
  { chave: "whatsapp_template_aniversario", label: "Template WhatsApp — Aniversário do cliente", categoria: "Templates WhatsApp", tipo: "input", valorPadrao: "Feliz aniversário, {{cliente}}! 🎉 O time do(a) {{estabelecimento}} deseja muito sucesso e prepara um carinho especial para você. Vem nos visitar!" },
  { chave: "whatsapp_template_posatendimento", label: "Template WhatsApp — Pós-atendimento", categoria: "Templates WhatsApp", tipo: "input", valorPadrao: "Olá {{cliente}}! Obrigado(a) por escolher o(a) {{estabelecimento}}. Esperamos que tenha gostado do seu {{servico}} com {{profissional}}. Até a próxima!" },
  { chave: "whatsapp_template_lembrete", label: "Template WhatsApp — Lembrete de horário", categoria: "Templates WhatsApp", tipo: "input", valorPadrao: "Olá {{cliente}}! Lembrete do seu agendamento de {{servico}} com {{profissional}} hoje às {{hora}} no(a) {{estabelecimento}}. Te esperamos!" },
];

async function ensureDefaults(barbeariaId: number) {
  const existing = await db.select().from(parametrosConfigTable).where(eq(parametrosConfigTable.barbeariaId, barbeariaId));
  const existingKeys = new Set(existing.map(e => e.chave));

  const missing = PARAMETROS_DEFAULTS.filter(p => !existingKeys.has(p.chave));
  if (missing.length === 0) return;

  const rows = missing.map(p => ({
    barbeariaId,
    chave: p.chave,
    valor: p.valorPadrao,
    tipo: p.tipo,
  }));
  await db.insert(parametrosConfigTable).values(rows);
}

router.get("/tema-layout", requireAuth, async (req, res) => {
  const barbeariaId = parseInt(req.params.barbeariaId);
  if (isNaN(barbeariaId)) return res.status(400).json({ error: "ID inválido" });
  const user = (req as any).user;
  const userBarbId = await resolveUserBarbeariaId(user);
  if (userBarbId !== barbeariaId) return res.status(403).json({ error: "Sem permissão" });
  const rows = await db.select().from(parametrosConfigTable).where(
    and(eq(parametrosConfigTable.barbeariaId, barbeariaId), inArray(parametrosConfigTable.chave, ["tema_layout", "menu_modo"]))
  );
  const valorDe = (chave: string, fallback: string) =>
    rows.find(r => r.chave === chave)?.valor ?? PARAMETROS_DEFAULTS.find(d => d.chave === chave)?.valorPadrao ?? fallback;
  return res.json({ chave: "tema_layout", valor: valorDe("tema_layout", "Claro"), menuModo: valorDe("menu_modo", "Essencial") });
});

router.get("/", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = parseInt(req.params.barbeariaId);
  if (isNaN(barbeariaId)) return res.status(400).json({ error: "ID inválido" });

  const user = (req as any).user;
  const userBarbId = await resolveUserBarbeariaId(user);
  if (userBarbId !== barbeariaId) return res.status(403).json({ error: "Sem permissão" });

  await ensureDefaults(barbeariaId);

  const params = await db.select().from(parametrosConfigTable).where(eq(parametrosConfigTable.barbeariaId, barbeariaId));

  const result = params.map(p => {
    const def = PARAMETROS_DEFAULTS.find(d => d.chave === p.chave);
    return {
      id: p.id,
      chave: p.chave,
      valor: p.valor,
      tipo: p.tipo,
      label: def?.label || p.chave,
      categoria: def?.categoria || "Outros",
      opcoes: def?.opcoes || [],
      valorPadrao: def?.valorPadrao || "",
    };
  });

  return res.json(result);
});

const CLIENT_NOTIF_CHAVES = [
  "notif_cliente_lembrete_1dia",
  "notif_cliente_lembrete_2h",
  "notif_cliente_lembrete_30min",
  "notif_cliente_mensagem",
];

const SELF_SERVE_CHAVES = new Set(["tema_layout"]);

router.put("/:chave", requireAuth, async (req, res) => {
  const barbeariaId = parseInt(req.params.barbeariaId);
  if (isNaN(barbeariaId)) return res.status(400).json({ error: "ID inválido" });

  const user = (req as any).user;
  const isManager = user?.role === "dono" || user?.role === "gerente";
  if (!isManager && !SELF_SERVE_CHAVES.has(req.params.chave)) {
    return res.status(403).json({ error: "Sem permissão" });
  }
  const userBarbId = await resolveUserBarbeariaId(user);
  if (userBarbId !== barbeariaId) return res.status(403).json({ error: "Sem permissão" });

  const { chave } = req.params;
  const { valor } = req.body;
  if (valor === undefined || valor === null) return res.status(400).json({ error: "Valor é obrigatório" });

  if (chave === "agenda_horario_inicio" || chave === "agenda_horario_fim") {
    return res.status(400).json({
      error: "Este horário é controlado pela tela de Funcionamento. Edite lá para manter tudo sincronizado.",
      code: "use_funcionamento",
    });
  }

  if (CLIENT_NOTIF_CHAVES.includes(chave) && valor === "Sim") {
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      return res.status(400).json({
        error: "Esta função requer que o login com Google esteja ativo. Configure o Google Client ID nos parâmetros antes de ativar.",
        code: "google_client_id_required",
      });
    }
  }

  const [existing] = await db.select().from(parametrosConfigTable).where(
    and(eq(parametrosConfigTable.barbeariaId, barbeariaId), eq(parametrosConfigTable.chave, chave))
  );

  if (existing) {
    const [updated] = await db.update(parametrosConfigTable)
      .set({ valor: String(valor) })
      .where(eq(parametrosConfigTable.id, existing.id))
      .returning();
    return res.json(updated);
  }

  const def = PARAMETROS_DEFAULTS.find(d => d.chave === chave);
  const [inserted] = await db.insert(parametrosConfigTable).values({
    barbeariaId,
    chave,
    valor: String(valor),
    tipo: def?.tipo || "input",
  }).returning();
  return res.json(inserted);
});

router.delete("/:chave", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = parseInt(req.params.barbeariaId);
  if (isNaN(barbeariaId)) return res.status(400).json({ error: "ID inválido" });

  const user = (req as any).user;
  const userBarbId = await resolveUserBarbeariaId(user);
  if (userBarbId !== barbeariaId) return res.status(403).json({ error: "Sem permissão" });

  const { chave } = req.params;
  const def = PARAMETROS_DEFAULTS.find(d => d.chave === chave);
  if (!def) return res.status(404).json({ error: "Parâmetro não encontrado" });

  const [existing] = await db.select().from(parametrosConfigTable).where(
    and(eq(parametrosConfigTable.barbeariaId, barbeariaId), eq(parametrosConfigTable.chave, chave))
  );

  if (existing) {
    await db.update(parametrosConfigTable)
      .set({ valor: def.valorPadrao })
      .where(eq(parametrosConfigTable.id, existing.id));
  }

  return res.json({ chave, valor: def.valorPadrao, message: "Restaurado ao padrão" });
});

export default router;
