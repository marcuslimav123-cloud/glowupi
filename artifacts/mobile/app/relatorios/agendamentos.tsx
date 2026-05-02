import React from "react";
import { ReportListScreen } from "@/components/ReportListScreen";
import { formatCurrency } from "@/lib/api";

type Row = {
  id: number;
  data: string;
  horaInicio: string;
  clienteNome: string;
  profissionalNome: string;
  servicoNome: string;
  status: string;
  valor: number;
  encaixe: boolean;
};

export default function RelatorioAgendamentos() {
  return (
    <ReportListScreen<Row>
      title="Agendamentos"
      subtitle="Status, profissional e período"
      endpoint={(id, di, df) => `/barbearias/${id}/relatorios/agendamentos-report?dataInicio=${di}&dataFim=${df}`}
      queryKey="rel-agendamentos"
      csvFilename="agendamentos"
      itemKey={(r) => r.id}
      emptyMessage="Nenhum agendamento no período."
      emptyIcon="calendar"
      fields={[
        { label: "Data", value: (r) => `${r.data}${r.horaInicio ? " • " + r.horaInicio : ""}` },
        { label: "Cliente", value: (r) => r.clienteNome, prominent: true },
        { label: "Profissional", value: (r) => r.profissionalNome },
        { label: "Serviço", value: (r) => r.servicoNome },
        { label: "Status", value: (r) => r.status },
        { label: "Valor", value: (r) => formatCurrency(r.valor), csv: (r) => Number(r.valor || 0).toFixed(2) },
        { label: "Encaixe", value: (r) => (r.encaixe ? "Sim" : "Não") },
      ]}
    />
  );
}
