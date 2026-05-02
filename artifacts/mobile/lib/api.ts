import { getItem } from "@/lib/storage";

const TOKEN_KEY = "glow_upi_auth_token";

export const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export function apiUrl(path: string): string {
  if (path.startsWith("http")) return path;
  if (!path.startsWith("/")) path = "/" + path;
  return `${API_BASE}/api${path}`;
}

async function getToken(): Promise<string | null> {
  try {
    return await getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export type FetchOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
};

export async function fetchJson<T = any>(path: string, opts: FetchOptions = {}): Promise<T> {
  const token = await getToken();
  const url = apiUrl(path);
  const headers: Record<string, string> = {
    "Accept": "application/json",
    ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(opts.headers || {}),
  };
  const res = await fetch(url, {
    method: opts.method || "GET",
    headers,
    signal: opts.signal,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    const msg = (data && typeof data === "object" && (data.error || data.message)) || `Erro ${res.status}`;
    const err = new Error(msg) as any;
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data as T;
}

export function formatCurrency(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  if (Number.isNaN(n)) return "R$ 0,00";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatPhone(value: string): string {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function stripPhone(value: string): string {
  return String(value || "").replace(/\D/g, "");
}

export function whatsappLink(phone: string | null | undefined, text?: string): string {
  if (!phone) return "https://wa.me/";
  const digits = String(phone).replace(/\D/g, "");
  const normalized = digits.startsWith("55") && digits.length >= 12 ? digits : "55" + digits;
  const t = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${normalized}${t}`;
}

export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function dateToStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function strToDate(s: string): Date {
  return new Date(s + "T12:00:00");
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function minutesToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function generateTimeSlots(start: string, end: string, intervalMin: number): string[] {
  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);
  const slots: string[] = [];
  for (let m = startMin; m < endMin; m += intervalMin) {
    slots.push(minutesToTime(m));
  }
  return slots;
}

export function addMinutesToTime(time: string, minutes: number): string {
  return minutesToTime(timeToMinutes(time) + minutes);
}

export function formatDateBR(d: Date | string): string {
  const date = typeof d === "string" ? strToDate(d) : d;
  return date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
}

export function shortDateLabel(d: Date | string): string {
  const date = typeof d === "string" ? strToDate(d) : d;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Amanhã";
  if (diff === -1) return "Ontem";
  return date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
}

export function getWeekDates(dateStr: string): string[] {
  const d = strToDate(dateStr);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7));
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    dates.push(dateToStr(dd));
  }
  return dates;
}

export function getMonthDates(dateStr: string): (string | null)[] {
  const d = strToDate(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const dates: (string | null)[] = [];
  for (let i = 0; i < startOffset; i++) dates.push(null);
  for (let day = 1; day <= lastDay.getDate(); day++) {
    dates.push(dateToStr(new Date(year, month, day)));
  }
  while (dates.length % 7 !== 0) dates.push(null);
  return dates;
}

export function getHorizontalRange(dateStr: string, before = 3, after = 10): string[] {
  const center = strToDate(dateStr);
  const out: string[] = [];
  for (let i = -before; i <= after; i++) {
    const dd = new Date(center);
    dd.setDate(center.getDate() + i);
    out.push(dateToStr(dd));
  }
  return out;
}

export const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const WEEKDAYS_PT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
export const MONTHS_PT = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
