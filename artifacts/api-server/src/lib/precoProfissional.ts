// Preço e duração de um serviço podem ser personalizados por profissional
// (Profissionais → "Serviços que atende" → Valor/Tempo personalizado).
// Toda criação ou recálculo de agendamento/comanda deve passar por aqui,
// para que "Cabelo e Barba com o Gilvan" custe o valor do Gilvan, não o base.

type ServicoBase = { preco: string | number; duracaoMinutos: number | null };
type Override = { servicoId?: number; precoOverride: string | number | null; tempoOverride: number | null } | null | undefined;

export function precoDoProfissional(servico: ServicoBase, override: Override): string {
  if (override?.precoOverride != null && override.precoOverride !== "") return String(override.precoOverride);
  return String(servico.preco);
}

export function duracaoDoProfissional(servico: ServicoBase, override: Override, tempoPadrao: number): number {
  if (override?.tempoOverride != null && override.tempoOverride > 0) return override.tempoOverride;
  return servico.duracaoMinutos || tempoPadrao;
}
