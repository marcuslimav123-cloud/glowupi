import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { apiUrl, formatCurrency } from "@/lib/utils";
import ReportTemplate, { type ColumnDef } from "@/components/ReportTemplate";
import { TrendingUp } from "lucide-react";
import { format, subDays } from "date-fns";
import { Badge } from "@/components/ui/badge";

const COLUMNS: ColumnDef[] = [
  { key: "id", label: "#" },
  { key: "tipo", label: "Tipo", render: (v: string) => (
    <Badge variant={v === "receber" ? "default" : "destructive"} className="text-xs">
      {v === "receber" ? "A Receber" : "A Pagar"}
    </Badge>
  )},
  { key: "categoria", label: "Categoria" },
  { key: "descricao", label: "Descrição" },
  { key: "valor", label: "Valor", render: (v: number) => formatCurrency(v) },
  { key: "dataVencimento", label: "Vencimento" },
  { key: "dataPagamento", label: "Pagamento", render: (v: string) => v || "—" },
  { key: "status", label: "Status", render: (v: string) => (
    <Badge variant={v === "pago" ? "default" : v === "atrasado" ? "destructive" : "outline"} className="text-xs capitalize">{v}</Badge>
  )},
];

export default function FinanceiroReport() {
  const { barbeariaId } = useAuth();
  const [dataInicio, setDataInicio] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [dataFim, setDataFim] = useState(format(new Date(), "yyyy-MM-dd"));
  const [searchDI, setSearchDI] = useState(dataInicio);
  const [searchDF, setSearchDF] = useState(dataFim);

  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ["relatorio-financeiro", barbeariaId, searchDI, searchDF],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/relatorios/financeiro-report?dataInicio=${searchDI}&dataFim=${searchDF}`), { credentials: "include" });
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
    enabled: !!barbeariaId,
  });

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-foreground">Relatório Financeiro</h1>
        <p className="text-foreground/40 text-[14px] mt-0.5">Receitas e despesas do período</p>
      </div>
      <ReportTemplate
        title="Financeiro"
        columns={COLUMNS}
        data={data}
        isLoading={isLoading}
        dataInicio={dataInicio}
        dataFim={dataFim}
        onDataInicioChange={setDataInicio}
        onDataFimChange={setDataFim}
        onPesquisar={() => { setSearchDI(dataInicio); setSearchDF(dataFim); }}
        emptyIcon={<TrendingUp className="h-12 w-12 text-muted-foreground mx-auto" />}
        emptyMessage="Nenhuma conta financeira no período."
      />
    </AppLayout>
  );
}
