export const SAMPLE_CONTEXT: Record<string, string> = {
  cliente: "Maria Silva",
  servico: "Corte feminino",
  data: "15/05/2026",
  hora: "14:30",
  profissional: "Ana Paula",
  salao: "Studio Glow",
  valor: "R$ 80,00",
};

export function renderConteudoPreview(conteudo: string, ctx: Record<string, string> = SAMPLE_CONTEXT): string {
  return conteudo.replace(/\{(\w+)\}/g, (_m, key) => ctx[key] ?? `{${key}}`);
}
