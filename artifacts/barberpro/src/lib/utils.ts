import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const APP_NAME = "Glow Upi";
export const APP_TAGLINE = "Organize sua agenda e fidelize suas clientes";

const ROLE_LABELS: Record<string, string> = {
  dono: "proprietária",
  gerente: "gerente",
  colaborador: "colaboradora",
  barbeiro: "profissional",
  cliente: "cliente",
};

export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] || role;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function apiUrl(path: string): string {
  const base = import.meta.env.BASE_URL || "/";
  return `${base}api${path}`.replace(/\/\//g, "/");
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function stripPhone(value: string): string {
  return value.replace(/\D/g, "");
}

export function generateTimeSlots(start: string = "08:00", end: string = "20:00", interval: number = 30) {
  const slots = [];
  let current = new Date(`2000-01-01T${start}:00`);
  const endTime = new Date(`2000-01-01T${end}:00`);

  while (current <= endTime) {
    slots.push(current.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    current.setMinutes(current.getMinutes() + interval);
  }
  return slots;
}
