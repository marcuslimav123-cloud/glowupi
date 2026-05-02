import React from "react";
import { ReportListScreen } from "@/components/ReportListScreen";
import { formatCurrency } from "@/lib/api";

type Row = {
  nome: string;
  qtd: number;
  receita: number;
  custo: number;
  comissao: number;
  lucro: number;
  margem: number;
};

export default function LucroProdutosScreen() {
  return (
    <ReportListScreen<Row>
      title="Lucro por produto"
      subtitle="Receita − custo − comissões"
      endpoint={(id, di, df) => `/barbearias/${id}/relatorios/lucro-produtos?dataInicio=${di}&dataFim=${df}`}
      queryKey="rel-lucro-produtos"
      csvFilename="lucro_produtos"
      itemKey={(r, idx) => `${r.nome}-${idx}`}
      emptyIcon="trending-up"
      emptyMessage="Sem vendas de produto no período."
      fields={[
        { label: "Produto", value: (r) => r.nome, prominent: true },
        { label: "Qtd vendida", value: (r) => String(r.qtd ?? 0) },
        { label: "Receita", value: (r) => formatCurrency(r.receita), csv: (r) => Number(r.receita || 0).toFixed(2) },
        { label: "Custo", value: (r) => formatCurrency(r.custo), csv: (r) => Number(r.custo || 0).toFixed(2) },
        { label: "Comissão", value: (r) => formatCurrency(r.comissao), csv: (r) => Number(r.comissao || 0).toFixed(2) },
        { label: "Lucro", value: (r) => formatCurrency(r.lucro), csv: (r) => Number(r.lucro || 0).toFixed(2) },
        { label: "Margem %", value: (r) => `${Number(r.margem ?? 0).toFixed(1)}%`, csv: (r) => Number(r.margem || 0).toFixed(2) },
      ]}
    />
  );
}
