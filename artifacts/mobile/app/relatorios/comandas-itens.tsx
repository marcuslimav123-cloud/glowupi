import React from "react";
import { ReportListScreen } from "@/components/ReportListScreen";
import { formatCurrency } from "@/lib/api";

type Row = {
  comandaId: number;
  clienteNome: string;
  profissionalNome: string;
  servicoNome: string;
  valor: number;
  data: string;
};

export default function ComandasItensScreen() {
  return (
    <ReportListScreen<Row>
      title="Itens de comanda"
      subtitle="Detalhamento de serviços e produtos"
      endpoint={(id, di, df) => `/barbearias/${id}/relatorios/comandas-itens?dataInicio=${di}&dataFim=${df}`}
      queryKey="rel-comandas-itens"
      csvFilename="comandas_itens"
      itemKey={(r, idx) => `${r.comandaId}-${idx}`}
      emptyIcon="list"
      emptyMessage="Nenhum item no período."
      fields={[
        { label: "Comanda #", value: (r) => String(r.comandaId) },
        { label: "Data", value: (r) => r.data || "—" },
        { label: "Cliente", value: (r) => r.clienteNome, prominent: true },
        { label: "Profissional", value: (r) => r.profissionalNome },
        { label: "Item", value: (r) => r.servicoNome },
        { label: "Valor", value: (r) => formatCurrency(r.valor), csv: (r) => Number(r.valor || 0).toFixed(2) },
      ]}
    />
  );
}
