import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { apiUrl, formatCurrency } from "@/lib/utils";
import ReportTemplate, { type ColumnDef } from "@/components/ReportTemplate";
import { Boxes } from "lucide-react";
import { format, subDays } from "date-fns";

const COLUMNS: ColumnDef[] = [
  { key: "nome", label: "Pacote" },
  { key: "clienteNome", label: "Cliente" },
  { key: "valorTotal", label: "Valor Total", render: (v: number) => formatCurrency(v) },
  { key: "sessoes", label: "Sessões" },
  { key: "sessoesUsadas", label: "Usadas" },
  { key: "status", label: "Status" },
  { key: "dataVenda", label: "Data Venda" },
];

export default function PacotesReport() {
  const { barbeariaId } = useAuth();
  const [dataInicio, setDataInicio] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [dataFim, setDataFim] = useState(format(new Date(), "yyyy-MM-dd"));
  const [searchDI, setSearchDI] = useState(dataInicio);
  const [searchDF, setSearchDF] = useState(dataFim);

  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ["relatorio-pacotes", barbeariaId, searchDI, searchDF],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/relatorios/pacotes?dataInicio=${searchDI}&dataFim=${searchDF}`), { credentials: "include" });
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
    enabled: !!barbeariaId,
  });

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-foreground">Relatório de Pacotes</h1>
        <p className="text-foreground/40 text-[14px] mt-0.5">Vendas e uso de pacotes</p>
      </div>
      <ReportTemplate
        title="Pacotes"
        columns={COLUMNS}
        data={data}
        isLoading={isLoading}
        dataInicio={dataInicio}
        dataFim={dataFim}
        onDataInicioChange={setDataInicio}
        onDataFimChange={setDataFim}
        onPesquisar={() => { setSearchDI(dataInicio); setSearchDF(dataFim); }}
        emptyIcon={<Boxes className="h-12 w-12 text-muted-foreground mx-auto" />}
        emptyMessage="Nenhum pacote encontrado no período."
      />
    </AppLayout>
  );
}
