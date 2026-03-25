import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { apiUrl } from "@/lib/utils";
import ReportTemplate, { type ColumnDef } from "@/components/ReportTemplate";
import { Cake } from "lucide-react";
import { format, subDays, addDays } from "date-fns";
import { Badge } from "@/components/ui/badge";

const COLUMNS: ColumnDef[] = [
  { key: "nome", label: "Nome" },
  { key: "aniversario", label: "Data" },
  { key: "diasAte", label: "Dias", render: (v: number) => (
    <Badge variant={v === 0 ? "default" : v < 0 ? "secondary" : "outline"} className="text-xs">
      {v === 0 ? "Hoje!" : v > 0 ? `em ${v} dias` : `há ${Math.abs(v)} dias`}
    </Badge>
  )},
  { key: "telefone", label: "Telefone" },
];

export default function Aniversariantes() {
  const { barbeariaId } = useAuth();
  const [dataInicio, setDataInicio] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dataFim, setDataFim] = useState(format(addDays(new Date(), 30), "yyyy-MM-dd"));
  const [searchDI, setSearchDI] = useState(dataInicio);
  const [searchDF, setSearchDF] = useState(dataFim);

  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ["relatorio-aniversariantes", barbeariaId, searchDI, searchDF],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/relatorios/aniversariantes?dataInicio=${searchDI}&dataFim=${searchDF}`), { credentials: "include" });
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
    enabled: !!barbeariaId,
  });

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-foreground">Aniversariantes</h1>
        <p className="text-foreground/40 text-[14px] mt-0.5">Clientes com aniversário no período</p>
      </div>
      <ReportTemplate
        title="Aniversariantes"
        columns={COLUMNS}
        data={data}
        isLoading={isLoading}
        dataInicio={dataInicio}
        dataFim={dataFim}
        onDataInicioChange={setDataInicio}
        onDataFimChange={setDataFim}
        onPesquisar={() => { setSearchDI(dataInicio); setSearchDF(dataFim); }}
        emptyIcon={<Cake className="h-12 w-12 text-muted-foreground mx-auto" />}
        emptyMessage="Nenhum aniversariante no período."
      />
    </AppLayout>
  );
}
