// Catálogo oficial de planos (mesma tabela de deploy/setup-stripe-planos.py).
// É a referência para escolher, entre os produtos existentes no Stripe, o preço
// certo de cada plano/período, e para recusar um checkout com valor diferente
// do anunciado.

export const PERIODOS = ["mensal", "semestral", "anual"] as const;
export type Periodo = (typeof PERIODOS)[number];

export const TIERS = ["1_pro", "2_5_pro", "6_15_pro", "15_plus_pro"] as const;
export type Tier = (typeof TIERS)[number] | "single";

export const CATALOGO: Record<Tier, { nome: string; precos: Partial<Record<Periodo, number>> }> = {
  "1_pro": { nome: "Glow Upi 1 Profissional", precos: { mensal: 7990, semestral: 40680, anual: 67080 } },
  "2_5_pro": { nome: "Glow Upi 2 a 5 Profissionais", precos: { mensal: 10990, semestral: 55980, anual: 92280 } },
  "6_15_pro": { nome: "Glow Upi 6 a 15 Profissionais", precos: { mensal: 16450, semestral: 83880, anual: 138180 } },
  "15_plus_pro": { nome: "Glow Upi +15 Profissionais", precos: { mensal: 21990, semestral: 112080, anual: 184680 } },
  single: { nome: "Glow Upi Acesso Completo", precos: { mensal: 9700 } },
};

export function isTier(v: unknown): v is Tier {
  return typeof v === "string" && (v === "single" || (TIERS as readonly string[]).includes(v));
}

export function valorEsperado(tier: Tier, periodo: Periodo): number | undefined {
  return CATALOGO[tier]?.precos[periodo];
}

type Recurring = { interval?: string; interval_count?: number } | null | undefined;

// Período de um preço: pela metadata, ou deduzido da recorrência do Stripe.
export function periodoDoPreco(price: { metadata?: Record<string, string> | null; recurring?: Recurring }): Periodo | null {
  const meta = price.metadata?.period;
  if (meta && (PERIODOS as readonly string[]).includes(meta)) return meta as Periodo;
  const r = price.recurring;
  if (!r) return null;
  const n = r.interval_count ?? 1;
  if (r.interval === "month" && n === 1) return "mensal";
  if (r.interval === "month" && n === 6) return "semestral";
  if (r.interval === "year" && n === 1) return "anual";
  return null;
}

type PriceLike = { id: string; unit_amount?: number | null; active?: boolean; metadata?: Record<string, string> | null; recurring?: Recurring };

// Para um produto, escolhe no máximo um preço por período: primeiro o que bate
// com o valor do catálogo, senão o primeiro do período.
export function escolherPrecos<P extends PriceLike>(tier: Tier, prices: P[]): P[] {
  const escolhidos: P[] = [];
  for (const periodo of PERIODOS) {
    const doPeriodo = prices.filter((p) => p.active !== false && periodoDoPreco(p) === periodo);
    if (doPeriodo.length === 0) continue;
    const esperado = valorEsperado(tier, periodo);
    const exato = esperado !== undefined ? doPeriodo.find((p) => p.unit_amount === esperado) : undefined;
    escolhidos.push(exato ?? doPeriodo[0]);
  }
  return escolhidos;
}

// Quanto um produto "parece" ser o oficial daquele plano: períodos com valor
// igual ao catálogo contam 1 cada; nome oficial desempata.
export function pontuarProduto(tier: Tier, produto: { name?: string | null }, prices: PriceLike[]): number {
  let pontos = 0;
  for (const periodo of PERIODOS) {
    const esperado = valorEsperado(tier, periodo);
    if (esperado !== undefined && prices.some((p) => p.active !== false && periodoDoPreco(p) === periodo && p.unit_amount === esperado)) pontos += 1;
  }
  if ((produto.name || "").startsWith("Glow Upi")) pontos += 0.5;
  return pontos;
}
