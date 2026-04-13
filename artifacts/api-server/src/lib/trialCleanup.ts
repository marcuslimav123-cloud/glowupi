import { db } from "@workspace/db";
import { barbeariasTable, usersTable } from "@workspace/db/schema";
import { eq, and, lt, isNull } from "drizzle-orm";
import { sql } from "drizzle-orm";

const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
const RETENTION_MONTHS = 3;

const DEPENDENT_TABLES = [
  "profissional_servicos", "profissionais_perfis", "comissoes",
  "contas_profissional", "caixa_diario", "agendamentos", "comandas",
  "servicos", "profissionais", "clientes", "produtos",
  "contas_financeiras", "pacotes", "avaliacoes", "lista_espera",
  "recompensas", "movimentacoes_estoque", "mensagens", "convites",
  "bloqueios_horario", "tipos", "cupons", "noticias", "lembretes",
  "assinaturas", "parametros_config", "perfis_acesso", "email_templates",
  "categorias_servico", "fornecedores", "equipamentos", "anamnese",
  "bandeiras", "remuneracoes", "mensagens_padrao", "pesquisa_satisfacao",
  "rodizio", "documentos", "clube_vantagens", "push_tokens",
  "admin_logs", "filiais", "notificacoes", "solicitacoes_cadastro",
  "brevo_email_log",
];

async function cleanupExpiredTrials() {
  try {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - RETENTION_MONTHS);

    const expiredBarbearias = await db.select({
      id: barbeariasTable.id,
      donoId: barbeariasTable.donoId,
    })
    .from(barbeariasTable)
    .where(
      and(
        eq(barbeariasTable.subscriptionStatus, "trial"),
        lt(barbeariasTable.planoVencimento, cutoffDate),
        isNull(barbeariasTable.stripeSubscriptionId)
      )
    );

    if (expiredBarbearias.length === 0) {
      console.log("[Trial Cleanup] Nenhum trial expirado para limpeza.");
      return;
    }

    console.log(`[Trial Cleanup] Encontrados ${expiredBarbearias.length} trials expirados para limpeza.`);

    for (const barbearia of expiredBarbearias) {
      try {
        await db.transaction(async (tx) => {
          for (const table of DEPENDENT_TABLES) {
            await tx.execute(sql.raw(`DELETE FROM "${table}" WHERE barbearia_id = ${barbearia.id}`));
          }

          await tx.delete(barbeariasTable).where(eq(barbeariasTable.id, barbearia.id));

          const [otherBarbearia] = await tx.select({ id: barbeariasTable.id })
            .from(barbeariasTable)
            .where(eq(barbeariasTable.donoId, barbearia.donoId))
            .limit(1);

          if (!otherBarbearia) {
            await tx.execute(sql.raw(`DELETE FROM "lgpd_consents" WHERE user_id = ${barbearia.donoId}`));
            await tx.execute(sql.raw(`DELETE FROM "password_reset_tokens" WHERE user_id = ${barbearia.donoId}`));
            await tx.delete(usersTable).where(eq(usersTable.id, barbearia.donoId));
          }
        });

        console.log(`[Trial Cleanup] Dados removidos: barbearia #${barbearia.id}`);
      } catch (e) {
        console.error(`[Trial Cleanup] Erro ao limpar barbearia #${barbearia.id}:`, e);
      }
    }

    console.log("[Trial Cleanup] Limpeza concluída.");
  } catch (e) {
    console.error("[Trial Cleanup] Erro geral:", e);
  }
}

export function startTrialCleanupScheduler() {
  console.log("[Trial Cleanup] Scheduler iniciado. Execução a cada 24h.");
  cleanupExpiredTrials();
  setInterval(cleanupExpiredTrials, CLEANUP_INTERVAL_MS);
}
