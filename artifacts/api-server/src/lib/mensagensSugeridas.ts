import { db } from "@workspace/db";
import { mensagensSugeridasTable, mensagensPadraoTable, barbeariasTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { buildContexto, renderConteudo, type Categoria } from "./mensagensRender.js";

export type SugeridaTipo = "confirmacao" | "lembrete" | "aniversario";

interface CreateSugeridaParams {
  barbeariaId: number;
  tipo: SugeridaTipo;
  agendamentoId?: number | null;
  clienteId?: number | null;
  contexto?: Record<string, any>;
  dedupeKey: string;
  fallbackTexto: string;
  categoriaPreferida: Categoria;
}

export async function isModoHumanoAtivo(barbeariaId: number): Promise<boolean> {
  const [b] = await db.select({ modoHumano: barbeariasTable.modoHumano }).from(barbeariasTable)
    .where(eq(barbeariasTable.id, barbeariaId)).limit(1);
  return !!b?.modoHumano;
}

export async function pickModeloFavoritoOuQualquer(barbeariaId: number, categoria: Categoria) {
  const [favorito] = await db.select().from(mensagensPadraoTable).where(
    and(
      eq(mensagensPadraoTable.barbeariaId, barbeariaId),
      eq(mensagensPadraoTable.categoria, categoria),
      eq(mensagensPadraoTable.arquivado, false),
      eq(mensagensPadraoTable.favorito, true),
    )
  ).limit(1);
  if (favorito) return favorito;
  const [qualquer] = await db.select().from(mensagensPadraoTable).where(
    and(
      eq(mensagensPadraoTable.barbeariaId, barbeariaId),
      eq(mensagensPadraoTable.categoria, categoria),
      eq(mensagensPadraoTable.arquivado, false),
    )
  ).limit(1);
  return qualquer || null;
}

export async function criarSugerida(params: CreateSugeridaParams): Promise<{ created: boolean; id?: number }> {
  try {
    const existing = await db.select({ id: mensagensSugeridasTable.id }).from(mensagensSugeridasTable)
      .where(eq(mensagensSugeridasTable.dedupeKey, params.dedupeKey)).limit(1);
    if (existing.length > 0) return { created: false, id: existing[0].id };

    const modelo = await pickModeloFavoritoOuQualquer(params.barbeariaId, params.categoriaPreferida);
    let conteudoSugerido = params.fallbackTexto;
    if (modelo) {
      const ctx = await buildContexto(params.barbeariaId, {
        agendamentoId: params.agendamentoId ?? null,
        clienteId: params.clienteId ?? null,
      });
      conteudoSugerido = renderConteudo(modelo.conteudo, ctx);
    }

    const [created] = await db.insert(mensagensSugeridasTable).values({
      barbeariaId: params.barbeariaId,
      tipo: params.tipo,
      agendamentoId: params.agendamentoId ?? null,
      clienteId: params.clienteId ?? null,
      modeloPadraoId: modelo?.id ?? null,
      contexto: params.contexto || {},
      conteudoSugerido,
      status: "pendente",
      dedupeKey: params.dedupeKey,
    }).returning({ id: mensagensSugeridasTable.id });
    return { created: true, id: created.id };
  } catch (e: any) {
    if (e?.code === "23505") {
      return { created: false };
    }
    console.error("[sugerida] error creating:", e);
    return { created: false };
  }
}
