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
  valor: number;
};

export default function ComandasCanceladasScreen() {
  return (
    <ReportListScreen<Row>
      title="Comandas canceladas"
      subtitle="Agendamentos cancelados no período"
      endpoint={(id, di, df) => `/barbearias/${id}/relatorios/comandas-canceladas?dataInicio=${di}&dataFim=${df}`}
      queryKey="rel-canceladas"
      csvFilename="comandas_canceladas"
      itemKey={(r) => r.id}
      emptyIcon="x-circle"
      emptyMessage="Nenhum cancelamento no período."
      fields={[
        { label: "Data", value: (r) => `${r.data}${r.horaInicio ? " • " + r.horaInicio : ""}` },
        { label: "Cliente", value: (r) => r.clienteNome, prominent: true },
        { label: "Profissional", value: (r) => r.profissionalNome },
        { label: "Serviço", value: (r) => r.servicoNome },
        { label: "Valor", value: (r) => formatCurrency(r.valor), csv: (r) => Number(r.valor || 0).toFixed(2) },
      ]}
    />
  );
}
