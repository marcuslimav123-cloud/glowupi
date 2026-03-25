import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { parametrosConfigTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth.js";

const router: IRouter = Router({ mergeParams: true });

export type ParamDef = {
  chave: string;
  label: string;
  categoria: string;
  tipo: "select" | "input";
  opcoes?: string[];
  valorPadrao: string;
};

export const PARAMETROS_DEFAULTS: ParamDef[] = [
  { chave: "agenda_tempo_padrao", label: "Tempo padrão para agendamento", categoria: "Agenda & Agendamentos", tipo: "select", opcoes: ["15min", "30min", "45min", "1h"], valorPadrao: "30min" },
  { chave: "agenda_limite_antecedencia", label: "Limite de antecedência para agendamento pelo App (horas)", categoria: "Agenda & Agendamentos", tipo: "input", valorPadrao: "2" },
  { chave: "agenda_mesmo_horario_cliente", label: "Permitir agendamento no mesmo horário pelo cliente", categoria: "Agenda & Agendamentos", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "agenda_limite_futuro_dias", label: "Limite de agendamento futuro pelo cliente (em dias)", categoria: "Agenda & Agendamentos", tipo: "input", valorPadrao: "30" },
  { chave: "agenda_limite_abertos_cliente", label: "Limite de agendamentos futuros em aberto por cliente", categoria: "Agenda & Agendamentos", tipo: "input", valorPadrao: "5" },
  { chave: "agenda_tamanho_slots", label: "Tamanho dos slots da agenda no Web", categoria: "Agenda & Agendamentos", tipo: "select", opcoes: ["15min", "30min", "45min", "1h"], valorPadrao: "30min" },
  { chave: "agenda_horario_inicio", label: "Início dos horários na agenda do WebAdmin", categoria: "Agenda & Agendamentos", tipo: "input", valorPadrao: "08:00" },
  { chave: "agenda_horario_fim", label: "Final dos horários na agenda do WebAdmin", categoria: "Agenda & Agendamentos", tipo: "input", valorPadrao: "20:00" },
  { chave: "agenda_limite_diario_mesmo_servico", label: "Limite de agendamento diário por cliente (mesmo serviço)", categoria: "Agenda & Agendamentos", tipo: "input", valorPadrao: "1" },

  { chave: "cancel_tolerancia_cliente", label: "Limite de tolerância de cancelamento pelo cliente (horas)", categoria: "Cancelamentos & Tolerância", tipo: "input", valorPadrao: "2" },
  { chave: "cancel_bloquear_profissional", label: "Não deixar cancelar horários (Profissional não-gestor)", categoria: "Cancelamentos & Tolerância", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "cancel_bloquear_edicao_profissional", label: "Bloquear edição de agendamento para profissionais não-gestores", categoria: "Cancelamentos & Tolerância", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },

  { chave: "comanda_obrigatoriedade_bandeira", label: "Obrigatoriedade da seleção de bandeira na comanda e venda de pacotes", categoria: "Comandas & Caixa", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "comanda_edicao_comissoes", label: "Campo de edição de comissões na comanda", categoria: "Comandas & Caixa", tipo: "select", opcoes: ["Bloquear", "Liberar"], valorPadrao: "Liberar" },
  { chave: "comanda_fechamento_nao_gestor", label: "Habilitar fechamento de comanda para usuários não-gestores", categoria: "Comandas & Caixa", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "comanda_inserir_profissionais_caixa", label: "Permitir inserção de comandas de profissionais no caixa", categoria: "Comandas & Caixa", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Sim" },
  { chave: "comanda_ver_dia_caixa", label: "Mostrar VER DIA no caixa", categoria: "Comandas & Caixa", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Sim" },
  { chave: "comanda_abertura_nao_gestor", label: "Não permitir abertura de comanda por profissionais não gestores", categoria: "Comandas & Caixa", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "comanda_reabertura_nao_gestor", label: "Não permitir reabertura de caixa/comandas por profissionais não-gestores", categoria: "Comandas & Caixa", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },

  { chave: "notif_mensagem_agendar_cancelar", label: "Habilitar envio de mensagem ao agendar/cancelar pelo aplicativo", categoria: "Notificações & Mensagens", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Sim" },
  { chave: "notif_link_confirmacao", label: "Enviar link de confirmação de agendamento no lembrete via Email, SMS e WhatsApp", categoria: "Notificações & Mensagens", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Sim" },
  { chave: "notif_tempo_lembrete", label: "Tempo para envio de lembrete automático (em horas)", categoria: "Notificações & Mensagens", tipo: "input", valorPadrao: "24" },
  { chave: "notif_aniversario_email", label: "Ativar envio automático de aniversário via Email", categoria: "Notificações & Mensagens", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "notif_pacote_expirando", label: "Enviar notificação quando cliente tiver pacote expirando", categoria: "Notificações & Mensagens", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Sim" },

  { chave: "comissao_zerar_fidelidade", label: "Zerar comissão ao realizar resgate do programa de fidelidade", categoria: "Comissões", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "comissao_nao_gerar_cortesia", label: "Não gerar comissões para itens que forem cortesias", categoria: "Comissões", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Sim" },
  { chave: "comissao_nao_gerar_pacote", label: "Não gerar comissão na comanda para serviços associados a pacotes comissionados", categoria: "Comissões", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },

  { chave: "cliente_controle_celular", label: "Ativar controle de clientes por número de celular", categoria: "Clientes & Cadastro", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "cliente_aprovar_cadastro_auto", label: "Aprovar solicitação de cadastro automaticamente", categoria: "Clientes & Cadastro", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Sim" },
  { chave: "cliente_agendar_sem_cliente", label: "Não permitir agendamento sem cliente por profissionais não-gestores", categoria: "Clientes & Cadastro", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "cliente_cadastro_nao_gestor", label: "Permitir cadastro de novo cliente no App para usuários não-gestores", categoria: "Clientes & Cadastro", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Sim" },

  { chave: "fidelidade_expiracao_pontos", label: "Dias para data de expiração de pontos", categoria: "Fidelidade & Pontos", tipo: "input", valorPadrao: "365" },
  { chave: "fidelidade_pontos_app_site", label: "Contabilizar pontos apenas para agendamentos feitos pelo App/Site pelo cliente", categoria: "Fidelidade & Pontos", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "fidelidade_desativar", label: "Desativar programa de fidelidade", categoria: "Fidelidade & Pontos", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },

  { chave: "outros_fuso_horario", label: "Fuso horário", categoria: "Outros", tipo: "select", opcoes: ["America/Sao_Paulo", "America/Manaus", "America/Bahia", "America/Recife", "America/Fortaleza", "America/Cuiaba", "America/Porto_Velho", "America/Rio_Branco", "America/Belem"], valorPadrao: "America/Sao_Paulo" },
  { chave: "outros_mostrar_produtos_app", label: "Mostrar produtos no App Cliente/Site", categoria: "Outros", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Sim" },
  { chave: "outros_habilitar_auxiliar", label: "Habilitar configuração de auxiliar", categoria: "Outros", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
  { chave: "outros_jornada_profissional_servico", label: "Ativar controle jornada × profissional × serviço", categoria: "Outros", tipo: "select", opcoes: ["Sim", "Não"], valorPadrao: "Não" },
];

async function ensureDefaults(barbeariaId: number) {
  const existing = await db.select().from(parametrosConfigTable).where(eq(parametrosConfigTable.barbeariaId, barbeariaId));
  if (existing.length > 0) return;

  const rows = PARAMETROS_DEFAULTS.map(p => ({
    barbeariaId,
    chave: p.chave,
    valor: p.valorPadrao,
    tipo: p.tipo,
  }));
  await db.insert(parametrosConfigTable).values(rows);
}

router.get("/", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = parseInt(req.params.barbeariaId);
  if (isNaN(barbeariaId)) return res.status(400).json({ error: "ID inválido" });

  const user = (req as any).user;
  if (user.barbeariaId !== barbeariaId) return res.status(403).json({ error: "Sem permissão" });

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

router.put("/:chave", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = parseInt(req.params.barbeariaId);
  if (isNaN(barbeariaId)) return res.status(400).json({ error: "ID inválido" });

  const user = (req as any).user;
  if (user.barbeariaId !== barbeariaId) return res.status(403).json({ error: "Sem permissão" });

  const { chave } = req.params;
  const { valor } = req.body;
  if (valor === undefined || valor === null) return res.status(400).json({ error: "Valor é obrigatório" });

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
  if (user.barbeariaId !== barbeariaId) return res.status(403).json({ error: "Sem permissão" });

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
