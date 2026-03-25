import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { apiUrl, formatCurrency } from "@/lib/utils";
import ReportTemplate, { type ColumnDef } from "@/components/ReportTemplate";
import { Trophy } from "lucide-react";
import { format, subDays } from "date-fns";

const PROF_COLUMNS: ColumnDef[] = [
  { key: "posicao", label: "#", render: (_v: any, _r: any, idx?: number) => (idx ?? 0) + 1 },
  { key: "nome", label: "Profissional" },
  { key: "atendimentos", label: "Atendimentos" },
  { key: "faturamento", label: "Faturamento", render: (v: number) => formatCurrency(v) },
];

const SERV_COLUMNS: ColumnDef[] = [
  { key: "posicao", label: "#", render: (_v: any, _r: any, idx?: number) => (idx ?? 0) + 1 },
  { key: "nome", label: "Serviço" },
  { key: "quantidade", label: "Quantidade" },
  { key: "faturamento", label: "Faturamento", render: (v: number) => formatCurrency(v) },
];

export default function RankingsReport() {
  const { barbeariaId } = useAuth();
  const [dataInicio, setDataInicio] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [dataFim, setDataFim] = useState(format(new Date(), "yyyy-MM-dd"));
  const [searchDI, setSearchDI] = useState(dataInicio);
  const [searchDF, setSearchDF] = useState(dataFim);
  const [view, setView] = useState<"profissionais" | "servicos">("profissionais");

  const { data, isLoading } = useQuery<any>({
    queryKey: ["relatorio-rankings", barbeariaId, searchDI, searchDF],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/relatorios/rankings?dataInicio=${searchDI}&dataFim=${searchDF}`), { credentials: "include" });
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
    enabled: !!barbeariaId,
  });

  const tableData = view === "profissionais" ? (data?.profissionais ?? []) : (data?.servicos ?? []);
  const columns = view === "profissionais" ? PROF_COLUMNS : SERV_COLUMNS;

  return (
    <AppLayout>
      <div className="mb-4">
        <h1 className="text-[24px] font-bold text-foreground">Rankings</h1>
        <p className="text-foreground/40 text-[14px] mt-0.5">Profissionais e serviços mais populares</p>
      </div>
      <div className="flex gap-2 mb-4">
        <button
          className={`px-4 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${view === "profissionais" ? "bg-foreground text-white" : "bg-black/[0.04] text-foreground/60 hover:bg-black/[0.06]"}`}
          onClick={() => setView("profissionais")}
        >
          Profissionais
        </button>
        <button
          className={`px-4 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${view === "servicos" ? "bg-foreground text-white" : "bg-black/[0.04] text-foreground/60 hover:bg-black/[0.06]"}`}
          onClick={() => setView("servicos")}
        >
          Serviços
        </button>
      </div>
      <ReportTemplate
        title={`Ranking ${view === "profissionais" ? "Profissionais" : "Serviços"}`}
        columns={columns}
        data={tableData}
        isLoading={isLoading}
        dataInicio={dataInicio}
        dataFim={dataFim}
        onDataInicioChange={setDataInicio}
        onDataFimChange={setDataFim}
        onPesquisar={() => { setSearchDI(dataInicio); setSearchDF(dataFim); }}
        emptyIcon={<Trophy className="h-12 w-12 text-muted-foreground mx-auto" />}
        emptyMessage="Sem dados no período."
      />
    </AppLayout>
  );
}
