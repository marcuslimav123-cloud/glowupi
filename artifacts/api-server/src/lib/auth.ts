import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { db } from "@workspace/db";
import { usersTable, barbeariasTable, clienteUsersTable, superAdminsTable } from "@workspace/db/schema";
import { eq, and, or } from "drizzle-orm";

const SESSIONS: Map<string, { userId: number; expiresAt: Date }> = new Map();
const CLIENT_SESSIONS: Map<string, { clienteUserId: number; expiresAt: Date }> = new Map();

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
  if (user.ativo === false) {
    SESSIONS.delete(token);
    return res.status(403).json({ error: "user_deactivated", message: "Sua conta foi desativada. Entre em contato com o suporte." });
  }
  (req as any).user = user;
  (req as any).token = token;
  next();
}

export async function requireBarbearia(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  let barbearia;
  if (user.role === "dono") {
    [barbearia] = await db
      .select()
      .from(barbeariasTable)
      .where(eq(barbeariasTable.donoId, user.id))
      .limit(1);
  } else if (user.barbeariaId) {
    [barbearia] = await db
      .select()
      .from(barbeariasTable)
      .where(eq(barbeariasTable.id, user.barbeariaId))
      .limit(1);
  }
  if (!barbearia) {
    return res.status(403).json({ error: "Barbearia não encontrada" });
  }
  (req as any).barbearia = barbearia;
  next();
}

export async function requireActiveSubscription(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (user) {
    const [superAdmin] = await db.select().from(superAdminsTable).where(eq(superAdminsTable.email, user.email)).limit(1);
    if (superAdmin && superAdmin.ativo) {
      return next();
    }
  }

  const barbearia = (req as any).barbearia;
  if (!barbearia) {
    return res.status(403).json({ error: "Barbearia não encontrada" });
  }

  if (barbearia.ativo === false) {
    return res.status(403).json({
      error: "establishment_deactivated",
      message: "Este estabelecimento foi desativado. Entre em contato com o suporte.",
    });
  }

  const status = barbearia.subscriptionStatus || "trial";

  if (status === "ativo") {
    return next();
  }

  if (status === "trial") {
    if (barbearia.planoVencimento) {
      const vencimento = new Date(barbearia.planoVencimento);
      if (vencimento < new Date()) {
        return res.status(403).json({
          error: "trial_expired",
          message: "Seu período de teste expirou. Assine um plano para continuar.",
        });
      }
    }
    return next();
  }

  return res.status(403).json({
    error: "subscription_inactive",
    message: "Sua assinatura está inativa. Renove seu plano para continuar.",
  });
}

export const PLAN_PROFESSIONAL_LIMITS: Record<string, number> = {
  "1_pro": 1,
  "2_5_pro": 5,
  "6_15_pro": 15,
  "15_plus_pro": 999,
  "single": 999,
  "trial": 999,
};

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Não autenticado" });
    }
    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: "Sem permissão para este recurso" });
    }
    next();
  };
}

export function createClientSession(clienteUserId: number): string {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  CLIENT_SESSIONS.set(token, { clienteUserId, expiresAt });
  return token;
}

export function getClientSession(token: string): { clienteUserId: number } | null {
  const session = CLIENT_SESSIONS.get(token);
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    CLIENT_SESSIONS.delete(token);
    return null;
  }
  return { clienteUserId: session.clienteUserId };
}

export function deleteClientSession(token: string): void {
  CLIENT_SESSIONS.delete(token);
}

export async function requireClient(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.["client_session"] || req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ error: "Cliente não autenticado" });
  }
  const session = getClientSession(token);
  if (!session) {
    return res.status(401).json({ error: "Sessão inválida ou expirada" });
  }
  const [clienteUser] = await db.select().from(clienteUsersTable).where(eq(clienteUsersTable.id, session.clienteUserId)).limit(1);
  if (!clienteUser) {
    return res.status(401).json({ error: "Cliente não encontrado" });
  }
  (req as any).clienteUser = clienteUser;
  (req as any).clientToken = token;
  next();
}

export async function optionalClient(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.["client_session"] || req.headers.authorization?.replace("Bearer ", "");
  if (token) {
    const session = getClientSession(token);
    if (session) {
      const [clienteUser] = await db.select().from(clienteUsersTable).where(eq(clienteUsersTable.id, session.clienteUserId)).limit(1);
      if (clienteUser) {
        (req as any).clienteUser = clienteUser;
        (req as any).clientToken = token;
      }
    }
  }
  next();
}

export async function checkBarbeariaAccess(req: any, res: any, options?: { writeAccess?: boolean }): Promise<number | null> {
  const barbeariaId = parseInt(req.params.barbeariaId);
  if (isNaN(barbeariaId)) {
    res.status(400).json({ error: "ID inválido" });
    return null;
  }
  const user = req.user;
  if (user.role === "dono") {
    const [b] = await db.select().from(barbeariasTable).where(
      and(eq(barbeariasTable.id, barbeariaId), eq(barbeariasTable.donoId, user.id))
    ).limit(1);
    if (!b) {
      res.status(403).json({ error: "Acesso negado" });
      return null;
    }
  } else if (user.role === "gerente" || user.role === "colaborador") {
    if (user.barbeariaId !== barbeariaId) {
      res.status(403).json({ error: "Acesso negado" });
      return null;
    }
  } else {
    res.status(403).json({ error: "Acesso negado" });
    return null;
  }
  return barbeariaId;
}

export async function checkBarbeariaAccessDono(req: any, res: any): Promise<number | null> {
  const barbeariaId = parseInt(req.params.barbeariaId);
  if (isNaN(barbeariaId)) {
    res.status(400).json({ error: "ID inválido" });
    return null;
  }
  const user = req.user;
  if (user.role !== "dono") {
    res.status(403).json({ error: "Apenas o proprietário pode acessar este recurso" });
    return null;
  }
  const [b] = await db.select().from(barbeariasTable).where(
    and(eq(barbeariasTable.id, barbeariaId), eq(barbeariasTable.donoId, user.id))
  ).limit(1);
  if (!b) {
    res.status(403).json({ error: "Acesso negado" });
    return null;
  }
  return barbeariaId;
}
