import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { apiUrl, formatCurrency } from "@/lib/utils";
import ReportTemplate, { type ColumnDef } from "@/components/ReportTemplate";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const COLUMNS: ColumnDef[] = [
  { key: "nome", label: "Nome" },
  { key: "telefone", label: "Telefone" },
  { key: "email", label: "Email", render: (v: string) => v || "—" },
  { key: "aniversario", label: "Aniversário", render: (v: string) => v || "—" },
  { key: "vip", label: "VIP", render: (v: boolean) => v ? <Badge className="text-xs bg-amber-50 text-amber-600">VIP</Badge> : "—" },
  { key: "pontosFidelidade", label: "Pontos" },
  { key: "totalGasto", label: "Total Gasto", render: (v: number) => formatCurrency(v) },
  { key: "ultimaVisita", label: "Última Visita", render: (v: string) => v || "—" },
];

export default function PerfilCliente() {
  const { barbeariaId } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");

  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ["relatorio-perfil-cliente", barbeariaId],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/relatorios/perfil-cliente`), { credentials: "include" });
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
    enabled: !!barbeariaId,
  });

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-foreground">Perfil do Cliente</h1>
        <p className="text-foreground/40 text-[14px] mt-0.5">Dados consolidados dos clientes</p>
      </div>
      <ReportTemplate
        title="Perfil do Cliente"
        columns={COLUMNS}
        data={data}
        isLoading={isLoading}
        dataInicio={today}
        dataFim={today}
        onDataInicioChange={() => {}}
        onDataFimChange={() => {}}
        onPesquisar={() => {}}
        showDateFilters={false}
        emptyIcon={<Users className="h-12 w-12 text-muted-foreground mx-auto" />}
        emptyMessage="Nenhum cliente cadastrado."
      />
    </AppLayout>
  );
}
