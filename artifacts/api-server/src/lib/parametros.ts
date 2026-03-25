import { db } from "@workspace/db";
import { parametrosConfigTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

export async function getParametro(barbeariaId: number, chave: string): Promise<string | null> {
  const [row] = await db.select().from(parametrosConfigTable).where(
    and(eq(parametrosConfigTable.barbeariaId, barbeariaId), eq(parametrosConfigTable.chave, chave))
  );
  return row?.valor ?? null;
}

export async function getParametros(barbeariaId: number): Promise<Record<string, string>> {
  const rows = await db.select().from(parametrosConfigTable).where(
    eq(parametrosConfigTable.barbeariaId, barbeariaId)
  );
  const map: Record<string, string> = {};
  for (const r of rows) map[r.chave] = r.valor;
  return map;
}
