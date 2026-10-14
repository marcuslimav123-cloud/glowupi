import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { apiUrl, formatCurrency } from "@/lib/utils";
import ReportTemplate, { type ColumnDef } from "@/components/ReportTemplate";
import { Package } from "lucide-react";
import { format, subDays } from "date-fns";

const COLUMNS: ColumnDef[] = [
  { key: "nome", label: "Produto" },
  { key: "categoria", label: "Categoria", render: (v: string) => v || "—" },
  { key: "quantidade", label: "Qtd. Atual" },
  { key: "precoVenda", label: "Preço Venda", render: (v: number) => formatCurrency(v) },
  { key: "validade", label: "Validade", render: (v: string) => v || "—" },
  { key: "ativo", label: "Status", render: (v: boolean) => v ? "Ativo" : "Inativo" },
];

export default function EstoqueReport() {
  const { barbeariaId } = useAuth();
  const [dataInicio, setDataInicio] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [dataFim, setDataFim] = useState(format(new Date(), "yyyy-MM-dd"));
  const [searchDI, setSearchDI] = useState(dataInicio);
  const [searchDF, setSearchDF] = useState(dataFim);

  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ["relatorio-estoque", barbeariaId, searchDI, searchDF],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/relatorios/estoque?dataInicio=${searchDI}&dataFim=${searchDF}`), { credentials: "include" });
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
    enabled: !!barbeariaId,
  });

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-foreground">Estoque</h1>
        <p className="text-foreground/40 text-[14px] mt-0.5">Visão geral do estoque de produtos</p>
      </div>
      <ReportTemplate
        title="Estoque"
        columns={COLUMNS}
        data={data}
        isLoading={isLoading}
        dataInicio={dataInicio}
        dataFim={dataFim}
        onDataInicioChange={setDataInicio}
        onDataFimChange={setDataFim}
        onPesquisar={() => { setSearchDI(dataInicio); setSearchDF(dataFim); }}
        emptyIcon={<Package className="h-12 w-12 text-muted-foreground mx-auto" />}
        emptyMessage="Nenhum produto encontrado."
      />
    </AppLayout>
  );
}
