import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { db } from "@workspace/db";
import { usersTable, barbeariasTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const SESSIONS: Map<string, { userId: number; expiresAt: Date }> = new Map();

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "barberpro_salt").digest("hex");
}

export function createSession(userId: number): string {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  SESSIONS.set(token, { userId, expiresAt });
  return token;
}

export function getSession(token: string): { userId: number } | null {
  const session = SESSIONS.get(token);
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    SESSIONS.delete(token);
    return null;
  }
  return { userId: session.userId };
}

export function deleteSession(token: string): void {
  SESSIONS.delete(token);
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.["session"] || req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ error: "Não autenticado" });
  }
  const session = getSession(token);
  if (!session) {
    return res.status(401).json({ error: "Sessão inválida ou expirada" });
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
  if (!user) {
    return res.status(401).json({ error: "Usuário não encontrado" });
  }
  (req as any).user = user;
  (req as any).token = token;
  next();
}

export async function requireBarbearia(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  const [barbearia] = await db
    .select()
    .from(barbeariasTable)
    .where(eq(barbeariasTable.donoId, user.id))
    .limit(1);
  if (!barbearia) {
    return res.status(403).json({ error: "Barbearia não encontrada" });
  }
  (req as any).barbearia = barbearia;
  next();
}
