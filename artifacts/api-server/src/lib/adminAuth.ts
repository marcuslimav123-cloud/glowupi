import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { superAdminsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const ADMIN_SESSIONS: Map<string, { adminId: number; expiresAt: Date }> = new Map();

const BCRYPT_ROUNDS = 12;

export async function hashAdminPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyAdminPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createAdminSession(adminId: number): string {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  ADMIN_SESSIONS.set(token, { adminId, expiresAt });
  return token;
}

export function getAdminSession(token: string): { adminId: number } | null {
  const session = ADMIN_SESSIONS.get(token);
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    ADMIN_SESSIONS.delete(token);
    return null;
  }
  return { adminId: session.adminId };
}

export function deleteAdminSession(token: string): void {
  ADMIN_SESSIONS.delete(token);
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.["admin_session"] || req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ error: "Não autenticado" });
  }
  const session = getAdminSession(token);
  if (!session) {
    return res.status(401).json({ error: "Sessão inválida ou expirada" });
  }
  const [admin] = await db.select().from(superAdminsTable).where(eq(superAdminsTable.id, session.adminId)).limit(1);
  if (!admin || !admin.ativo) {
    return res.status(401).json({ error: "Admin não encontrado" });
  }
  (req as any).admin = admin;
  (req as any).adminToken = token;
  next();
}

export async function seedSuperAdmins() {
  const existing = await db.select().from(superAdminsTable);
  if (existing.length > 0) return;

  const adminEmail = process.env.SUPER_ADMIN_EMAIL || "marcus@admin.com";
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD || "MaGu1409";
  const admin2Email = process.env.SUPER_ADMIN2_EMAIL || "gustavo@admin.com";
  const admin2Password = process.env.SUPER_ADMIN2_PASSWORD || "GuMa1409";

  await db.insert(superAdminsTable).values([
    {
      nome: "Marcus",
      email: adminEmail,
      senhaHash: await hashAdminPassword(adminPassword),
      ativo: true,
    },
    {
      nome: "Gustavo",
      email: admin2Email,
      senhaHash: await hashAdminPassword(admin2Password),
      ativo: true,
    },
  ]);
  console.log("Super admin accounts seeded");
}
