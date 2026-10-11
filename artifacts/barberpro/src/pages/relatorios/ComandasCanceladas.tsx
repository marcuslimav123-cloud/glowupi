import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { apiUrl, formatCurrency } from "@/lib/utils";
import ReportTemplate, { type ColumnDef } from "@/components/ReportTemplate";
import { XCircle } from "lucide-react";
import { format, subDays } from "date-fns";

const COLUMNS: ColumnDef[] = [
  { key: "id", label: "#" },
  { key: "data", label: "Data" },
  { key: "horaInicio", label: "Hora" },
  { key: "clienteNome", label: "Cliente" },
  { key: "profissionalNome", label: "Profissional" },
  { key: "servicoNome", label: "Serviço" },
  { key: "valor", label: "Valor", render: (v: number) => formatCurrency(v) },
];

export default function ComandasCanceladas() {
  const { barbeariaId } = useAuth();
  const [dataInicio, setDataInicio] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [dataFim, setDataFim] = useState(format(new Date(), "yyyy-MM-dd"));
  const [searchDI, setSearchDI] = useState(dataInicio);
  const [searchDF, setSearchDF] = useState(dataFim);

  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ["relatorio-canceladas", barbeariaId, searchDI, searchDF],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/relatorios/comandas-canceladas?dataInicio=${searchDI}&dataFim=${searchDF}`), { credentials: "include" });
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
    enabled: !!barbeariaId,
  });

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-foreground">Cancelamentos</h1>
        <p className="text-foreground/40 text-[14px] mt-0.5">Agendamentos cancelados no período</p>
      </div>
      <ReportTemplate
        title="Comandas Canceladas"
        columns={COLUMNS}
        data={data}
        isLoading={isLoading}
        dataInicio={dataInicio}
        dataFim={dataFim}
        onDataInicioChange={setDataInicio}
        onDataFimChange={setDataFim}
        onPesquisar={() => { setSearchDI(dataInicio); setSearchDF(dataFim); }}
        emptyIcon={<XCircle className="h-12 w-12 text-muted-foreground mx-auto" />}
        emptyMessage="Nenhuma comanda cancelada no período."
      />
    </AppLayout>
  );
}
