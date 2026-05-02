import React from "react";
import { ReportListScreen } from "@/components/ReportListScreen";
import { formatCurrency } from "@/lib/api";

type Row = {
  id: number;
  tipo: string;
  categoria: string;
  descricao: string;
  valor: number;
  dataVencimento: string;
  dataPagamento: string | null;
  status: string;
};

export default function FinanceiroScreen() {
  return (
    <ReportListScreen<Row>
      title="Financeiro"
      subtitle="Receitas e despesas do período"
      endpoint={(id, di, df) => `/barbearias/${id}/relatorios/financeiro-report?dataInicio=${di}&dataFim=${df}`}
      queryKey="rel-financeiro"
      csvFilename="financeiro"
      itemKey={(r) => r.id}
      emptyIcon="dollar-sign"
      emptyMessage="Sem contas no período."
      fields={[
        { label: "Tipo", value: (r) => (r.tipo === "receber" ? "A receber" : "A pagar"), prominent: true },
        { label: "Categoria", value: (r) => r.categoria || "—" },
        { label: "Descrição", value: (r) => r.descricao || "—" },
        { label: "Valor", value: (r) => formatCurrency(r.valor), csv: (r) => Number(r.valor || 0).toFixed(2) },
        { label: "Vencimento", value: (r) => r.dataVencimento || "—" },
        { label: "Pagamento", value: (r) => r.dataPagamento || "—" },
        { label: "Status", value: (r) => r.status },
      ]}
    />
  );
}
