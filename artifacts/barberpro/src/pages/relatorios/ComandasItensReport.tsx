import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { apiUrl, formatCurrency } from "@/lib/utils";
import ReportTemplate, { type ColumnDef } from "@/components/ReportTemplate";
import { ClipboardList } from "lucide-react";
import { format, subDays } from "date-fns";

const COLUMNS: ColumnDef[] = [
  { key: "comandaId", label: "Comanda #" },
  { key: "clienteNome", label: "Cliente" },
  { key: "servicoNome", label: "Serviço" },
  { key: "profissionalNome", label: "Profissional" },
  { key: "valor", label: "Valor", render: (v: number) => formatCurrency(v) },
  { key: "data", label: "Data" },
];

export default function ComandasItensReport() {
  const { barbeariaId } = useAuth();
  const [dataInicio, setDataInicio] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [dataFim, setDataFim] = useState(format(new Date(), "yyyy-MM-dd"));
  const [searchDI, setSearchDI] = useState(dataInicio);
  const [searchDF, setSearchDF] = useState(dataFim);

  const { data = [], isLoading } = useQuery<unknown[]>({
    queryKey: ["relatorio-comandas-itens", barbeariaId, searchDI, searchDF],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/relatorios/comandas-itens?dataInicio=${searchDI}&dataFim=${searchDF}`), { credentials: "include" });
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
    enabled: !!barbeariaId,
  });

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-foreground">Comandas — Itens</h1>
        <p className="text-foreground/40 text-[14px] mt-0.5">Detalhamento de serviços por comanda</p>
      </div>
      <ReportTemplate
        title="Comandas Itens"
        columns={COLUMNS}
        data={data}
        isLoading={isLoading}
        dataInicio={dataInicio}
        dataFim={dataFim}
        onDataInicioChange={setDataInicio}
        onDataFimChange={setDataFim}
        onPesquisar={() => { setSearchDI(dataInicio); setSearchDF(dataFim); }}
        emptyIcon={<ClipboardList className="h-12 w-12 text-muted-foreground mx-auto" />}
        emptyMessage="Nenhum item de comanda no período."
      />
    </AppLayout>
  );
}
