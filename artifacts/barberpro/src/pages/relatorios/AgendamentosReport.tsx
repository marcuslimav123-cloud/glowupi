import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { apiUrl, formatCurrency } from "@/lib/utils";
import ReportTemplate, { type ColumnDef } from "@/components/ReportTemplate";
import { CalendarDays } from "lucide-react";
import { format, subDays } from "date-fns";
import { Badge } from "@/components/ui/badge";

const STATUS_COLORS: Record<string, string> = {
  confirmado: "bg-green-50 text-green-600",
  pago: "bg-blue-50 text-blue-600",
  cancelado: "bg-red-50 text-red-500",
};

const COLUMNS: ColumnDef[] = [
  { key: "id", label: "#" },
  { key: "data", label: "Data" },
  { key: "horaInicio", label: "Hora" },
  { key: "clienteNome", label: "Cliente" },
  { key: "profissionalNome", label: "Profissional" },
  { key: "servicoNome", label: "Serviço" },
  { key: "status", label: "Status", render: (v: string) => (
    <Badge className={`text-xs ${STATUS_COLORS[v] || "bg-gray-50 text-gray-600"}`}>{v}</Badge>
  )},
  { key: "valor", label: "Valor", render: (v: number) => formatCurrency(v) },
  { key: "encaixe", label: "Encaixe", render: (v: boolean) => v ? "Sim" : "Não" },
];

export default function AgendamentosReport() {
  const { barbeariaId } = useAuth();
  const [dataInicio, setDataInicio] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [dataFim, setDataFim] = useState(format(new Date(), "yyyy-MM-dd"));
  const [searchDI, setSearchDI] = useState(dataInicio);
  const [searchDF, setSearchDF] = useState(dataFim);

  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ["relatorio-agendamentos", barbeariaId, searchDI, searchDF],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/relatorios/agendamentos-report?dataInicio=${searchDI}&dataFim=${searchDF}`), { credentials: "include" });
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
    enabled: !!barbeariaId,
  });

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-foreground">Agendamentos</h1>
        <p className="text-foreground/40 text-[14px] mt-0.5">Todos os agendamentos no período</p>
      </div>
      <ReportTemplate
        title="Agendamentos"
        columns={COLUMNS}
        data={data}
        isLoading={isLoading}
        dataInicio={dataInicio}
        dataFim={dataFim}
        onDataInicioChange={setDataInicio}
        onDataFimChange={setDataFim}
        onPesquisar={() => { setSearchDI(dataInicio); setSearchDF(dataFim); }}
        emptyIcon={<CalendarDays className="h-12 w-12 text-muted-foreground mx-auto" />}
        emptyMessage="Nenhum agendamento no período."
      />
    </AppLayout>
  );
}
