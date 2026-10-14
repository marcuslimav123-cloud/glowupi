import crypto from "node:crypto";

// Token assinado que vai no link "Confirmar Presença" dos lembretes por e-mail,
// para que só quem recebeu o e-mail consiga confirmar aquele agendamento.
const SECRET =
  process.env.CONFIRM_TOKEN_SECRET || process.env.DATABASE_URL || "glowupi-confirmacao";

export function makeConfirmToken(agendamentoId: number): string {
  return crypto.createHmac("sha256", SECRET).update(String(agendamentoId)).digest("hex").slice(0, 32);
}

export function verifyConfirmToken(agendamentoId: number, token: string): boolean {
  const expected = makeConfirmToken(agendamentoId);
  if (typeof token !== "string" || token.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}
