export const SAMPLE_CONTEXT: Record<string, string> = {
  cliente: "Maria Silva",
  servico: "Corte feminino",
  data: "15/05/2026",
  hora: "14:30",
  profissional: "Ana Paula",
  salao: "Studio Glow",
  valor: "R$ 80,00",
};

const ALIASES: Record<string, string> = {
  nome_cliente: "cliente", nome: "cliente", horario: "hora",
  estabelecimento: "salao", nome_empresa: "salao", empresa: "salao", barbearia: "salao", preco: "valor",
};

export function renderConteudoPreview(conteudo: string, ctx: Record<string, string> = SAMPLE_CONTEXT): string {
  const lookup = (key: string) => ctx[ALIASES[key] ?? key];
  return conteudo
    .replace(/\{\{\s*(\w+)\s*\}\}/g, (m, key) => lookup(key) ?? m)
    .replace(/\{(\w+)\}/g, (m, key) => lookup(key) ?? m);
}
