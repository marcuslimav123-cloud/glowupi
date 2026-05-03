import crypto from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;

function getKey(): Buffer {
  const dedicated = process.env.ASAAS_ENCRYPTION_KEY;
  if (process.env.NODE_ENV === "production" && !dedicated) {
    throw new Error("ASAAS_ENCRYPTION_KEY é obrigatório em produção para criptografar credenciais Asaas");
  }
  const raw = dedicated || process.env.SESSION_SECRET || "";
  if (!raw) {
    throw new Error("ASAAS_ENCRYPTION_KEY (ou SESSION_SECRET em dev) não configurado");
  }
  if (!dedicated) {
    console.warn("[asaas/crypto] ASAAS_ENCRYPTION_KEY ausente — derivando de SESSION_SECRET (apenas dev). Configure ASAAS_ENCRYPTION_KEY antes de produção.");
  }
  return crypto.createHash("sha256").update(raw).digest();
}

export function encryptApiKey(plain: string): string {
  if (!plain) return "";
  const key = getKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(":");
}

export function decryptApiKey(payload: string): string {
  if (!payload) return "";
  const parts = payload.split(":");
  if (parts.length !== 3) throw new Error("Payload criptografado inválido");
  const key = getKey();
  const iv = Buffer.from(parts[0], "base64");
  const tag = Buffer.from(parts[1], "base64");
  const enc = Buffer.from(parts[2], "base64");
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}

export function maskApiKey(plain: string): string {
  if (!plain || plain.length < 12) return "••••";
  return plain.slice(0, 8) + "••••" + plain.slice(-4);
}

export function generateWebhookToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}
