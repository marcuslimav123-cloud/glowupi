import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { apiUrl, formatCurrency } from "@/lib/utils";
import ReportTemplate, { type ColumnDef } from "@/components/ReportTemplate";
import { Package } from "lucide-react";
import { format, subDays } from "date-fns";
import { Badge } from "@/components/ui/badge";

const COLUMNS: ColumnDef[] = [
  { key: "nome", label: "Produto" },
  { key: "qtd", label: "Qtd Vendida" },
  { key: "receita", label: "Receita", render: (v: number) => formatCurrency(v) },
  { key: "custo", label: "Custo", render: (v: number) => formatCurrency(v) },
  { key: "comissao", label: "Comissão", render: (v: number) => formatCurrency(v) },
  { key: "lucro", label: "Lucro", render: (v: number) => (
    <span className={v >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>{formatCurrency(v)}</span>
  )},
  { key: "margem", label: "Margem %", render: (v: number) => (
    <Badge className={`text-[10px] ${v >= 30 ? "bg-green-50 text-green-600" : v >= 0 ? "bg-yellow-50 text-yellow-600" : "bg-red-50 text-red-600"}`}>{v}%</Badge>
  )},
];

export default function LucroProdutos() {
  const { barbeariaId } = useAuth();
  const [dataInicio, setDataInicio] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [dataFim, setDataFim] = useState(format(new Date(), "yyyy-MM-dd"));
  const [searchDI, setSearchDI] = useState(dataInicio);
  const [searchDF, setSearchDF] = useState(dataFim);

  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ["lucro-produtos", barbeariaId, searchDI, searchDF],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/relatorios/lucro-produtos?dataInicio=${searchDI}&dataFim=${searchDF}`), { credentials: "include" });
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
    enabled: !!barbeariaId,
  });

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-foreground">Lucro por Produtos</h1>
        <p className="text-foreground/40 text-[14px] mt-0.5">Receita - Custo - Comissões = Lucro por produto</p>
      </div>
      <ReportTemplate
        title="Lucro por Produtos"
        columns={COLUMNS}
        data={data}
        isLoading={isLoading}
        dataInicio={dataInicio}
        dataFim={dataFim}
        onDataInicioChange={setDataInicio}
        onDataFimChange={setDataFim}
        onPesquisar={() => { setSearchDI(dataInicio); setSearchDF(dataFim); }}
        emptyIcon={<Package className="h-12 w-12 text-muted-foreground mx-auto" />}
        emptyMessage="Nenhuma venda de produto no período."
      />
    </AppLayout>
  );
}
