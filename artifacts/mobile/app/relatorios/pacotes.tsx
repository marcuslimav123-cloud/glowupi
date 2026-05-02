import React from "react";
import { ReportListScreen } from "@/components/ReportListScreen";
import { formatCurrency } from "@/lib/api";

type Row = {
  nome: string;
  clienteNome: string;
  valorTotal: number;
  sessoes: number;
  sessoesUsadas: number;
  status: string;
  dataVenda: string;
};

export default function PacotesScreen() {
  return (
    <ReportListScreen<Row>
      title="Pacotes"
      subtitle="Vendas e uso de pacotes"
      endpoint={(id, di, df) => `/barbearias/${id}/relatorios/pacotes?dataInicio=${di}&dataFim=${df}`}
      queryKey="rel-pacotes"
      csvFilename="pacotes"
      itemKey={(r, idx) => `${r.dataVenda}-${idx}`}
      emptyIcon="package"
      emptyMessage="Sem pacotes no período."
      fields={[
        { label: "Pacote", value: (r) => r.nome, prominent: true },
        { label: "Cliente", value: (r) => r.clienteNome },
        { label: "Valor total", value: (r) => formatCurrency(r.valorTotal), csv: (r) => Number(r.valorTotal || 0).toFixed(2) },
        { label: "Sessões", value: (r) => `${r.sessoesUsadas ?? 0}/${r.sessoes ?? 0}` },
        { label: "Status", value: (r) => r.status },
        { label: "Venda", value: (r) => r.dataVenda || "—" },
      ]}
    />
  );
}
