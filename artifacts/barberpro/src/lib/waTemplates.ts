import { useQuery } from "@tanstack/react-query";
import { apiUrl } from "@/lib/utils";

export const WA_TEMPLATE_DEFAULTS: Record<string, string> = {
  whatsapp_template_confirmacao: "Olá {{cliente}}! Seu agendamento de {{servico}} com {{profissional}} no dia {{data}} às {{hora}} foi CONFIRMADO. Te esperamos no(a) {{estabelecimento}}!",
  whatsapp_template_recusa: "Olá {{cliente}}, infelizmente não conseguimos confirmar seu agendamento de {{servico}} no dia {{data}} às {{hora}}. Por favor, escolha outro horário. Obrigado(a) — {{estabelecimento}}",
  whatsapp_template_recuperacao: "Olá {{cliente}}! Sentimos sua falta no(a) {{estabelecimento}}. Que tal agendar um horário para voltar a se cuidar?",
  whatsapp_template_aniversario: "Feliz aniversário, {{cliente}}! 🎉 O time do(a) {{estabelecimento}} deseja muito sucesso e prepara um carinho especial para você. Vem nos visitar!",
  whatsapp_template_posatendimento: "Olá {{cliente}}! Obrigado(a) por escolher o(a) {{estabelecimento}}. Esperamos que tenha gostado do seu {{servico}} com {{profissional}}. Até a próxima!",
  whatsapp_template_lembrete: "Olá {{cliente}}! Lembrete do seu agendamento de {{servico}} com {{profissional}} hoje às {{hora}} no(a) {{estabelecimento}}. Te esperamos!",
};

export function renderWhatsappTemplate(template: string, vars: Record<string, string>): string {
  if (!template) return "";
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

export function buildWhatsappLink(phone: string | null | undefined, text?: string): string {
  if (!phone) return "https://wa.me/";
  const digits = String(phone).replace(/\D/g, "");
  const normalized = digits.startsWith("55") && digits.length >= 12 ? digits : "55" + digits;
  const t = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${normalized}${t}`;
}

export function useWhatsappTemplates(barbeariaId: number | null | undefined) {
  return useQuery<Record<string, string>>({
    queryKey: ["whatsapp-templates", barbeariaId],
    queryFn: async () => {
      const out: Record<string, string> = { ...WA_TEMPLATE_DEFAULTS };
      if (!barbeariaId) return out;
      try {
        const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/parametros`), { credentials: "include" });
        if (!res.ok) return out;
        const params: Array<{ chave: string; valor: string }> = await res.json();
        for (const p of params) {
          if (p.chave.startsWith("whatsapp_template_") && p.valor) {
            out[p.chave] = p.valor;
          }
        }
      } catch {}
      return out;
    },
    enabled: !!barbeariaId,
    staleTime: 5 * 60 * 1000,
  });
}
