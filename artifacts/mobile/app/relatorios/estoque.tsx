import React from "react";
import { ReportListScreen } from "@/components/ReportListScreen";
import { formatCurrency } from "@/lib/api";

type Row = {
  nome: string;
  categoria: string | null;
  quantidade: number;
  precoVenda: number;
  validade: string | null;
  ativo: boolean;
};

export default function EstoqueScreen() {
  return (
    <ReportListScreen<Row>
      title="Posição de estoque"
      subtitle="Saldo atual de produtos"
      endpoint={(id, di, df) => `/barbearias/${id}/relatorios/estoque?dataInicio=${di}&dataFim=${df}`}
      queryKey="rel-estoque"
      csvFilename="estoque"
      itemKey={(r, idx) => `${r.nome}-${idx}`}
      emptyIcon="box"
      emptyMessage="Sem produtos cadastrados."
      fields={[
        { label: "Produto", value: (r) => r.nome, prominent: true },
        { label: "Categoria", value: (r) => r.categoria || "—" },
        { label: "Qtd atual", value: (r) => String(r.quantidade ?? 0) },
        { label: "Preço venda", value: (r) => formatCurrency(r.precoVenda), csv: (r) => Number(r.precoVenda || 0).toFixed(2) },
        { label: "Validade", value: (r) => r.validade || "—" },
        { label: "Status", value: (r) => (r.ativo ? "Ativo" : "Inativo") },
      ]}
    />
  );
}
