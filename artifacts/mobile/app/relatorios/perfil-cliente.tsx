import React from "react";
import { ReportListScreen } from "@/components/ReportListScreen";
import { formatCurrency } from "@/lib/api";

type Row = {
  id: number;
  nome: string;
  telefone: string | null;
  email: string | null;
  aniversario: string | null;
  vip: boolean;
  pontosFidelidade: number;
  totalGasto: number;
  ultimaVisita: string | null;
};

export default function PerfilClienteScreen() {
  return (
    <ReportListScreen<Row>
      title="Perfil dos clientes"
      subtitle="Dados consolidados dos clientes"
      endpoint={(id, di, df) => `/barbearias/${id}/relatorios/perfil-cliente?dataInicio=${di}&dataFim=${df}`}
      queryKey="rel-perfil-cliente"
      csvFilename="perfil_cliente"
      itemKey={(r) => r.id}
      initialDays={90}
      emptyIcon="users"
      emptyMessage="Sem clientes no período."
      fields={[
        { label: "Cliente", value: (r) => r.nome, prominent: true },
        { label: "Telefone", value: (r) => r.telefone || "—" },
        { label: "E-mail", value: (r) => r.email || "—" },
        { label: "Aniversário", value: (r) => r.aniversario || "—" },
        { label: "VIP", value: (r) => (r.vip ? "Sim" : "Não") },
        { label: "Pontos", value: (r) => String(r.pontosFidelidade ?? 0) },
        { label: "Total gasto", value: (r) => formatCurrency(r.totalGasto), csv: (r) => Number(r.totalGasto || 0).toFixed(2) },
        { label: "Última visita", value: (r) => r.ultimaVisita || "—" },
      ]}
    />
  );
}
