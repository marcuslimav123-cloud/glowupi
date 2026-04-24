import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { apiUrl } from "@/lib/utils";
import ReportTemplate, { type ColumnDef } from "@/components/ReportTemplate";
import { Cake, MessageCircle } from "lucide-react";
import { format, addDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useWhatsappTemplates, renderWhatsappTemplate, buildWhatsappLink } from "@/lib/waTemplates";

export default function Aniversariantes() {
  const { barbeariaId } = useAuth();
  const [dataInicio, setDataInicio] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dataFim, setDataFim] = useState(format(addDays(new Date(), 30), "yyyy-MM-dd"));
  const [searchDI, setSearchDI] = useState(dataInicio);
  const [searchDF, setSearchDF] = useState(dataFim);

  const { data: waTemplates } = useWhatsappTemplates(barbeariaId);
  const { data: barbeariaInfo } = useQuery<{ nome?: string }>({
    queryKey: ["barbearia-nome", barbeariaId],
    queryFn: async () => {
      if (!barbeariaId) return { nome: "" };
      const r = await fetch(apiUrl(`/barbearias/${barbeariaId}`), { credentials: "include" });
      if (!r.ok) return { nome: "" };
      return r.json();
    },
    enabled: !!barbeariaId,
    staleTime: 60_000,
  });
  const nomeEstabelecimento = barbeariaInfo?.nome || "";

  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ["relatorio-aniversariantes", barbeariaId, searchDI, searchDF],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/relatorios/aniversariantes?dataInicio=${searchDI}&dataFim=${searchDF}`), { credentials: "include" });
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
    enabled: !!barbeariaId,
  });

  const COLUMNS = useMemo<ColumnDef[]>(() => [
    { key: "imagem", label: "Foto", render: (v: string) => (
      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[11px] font-semibold overflow-hidden">
        {v ? <img src={v} alt="" className="h-full w-full object-cover" /> : "—"}
      </div>
    )},
    { key: "nome", label: "Nome" },
    { key: "aniversario", label: "Data" },
    { key: "diasAte", label: "Dias", render: (v: number) => (
      <Badge variant={v === 0 ? "default" : v < 0 ? "secondary" : "outline"} className="text-xs">
        {v === 0 ? "Hoje!" : v > 0 ? `em ${v} dias` : `há ${Math.abs(v)} dias`}
      </Badge>
    )},
    { key: "telefone", label: "Telefone", render: (v: string) => v || "—" },
    { key: "celular", label: "Celular", render: (v: string) => v || "—" },
    { key: "_wa", label: "WhatsApp", render: (_v, row: any) => {
      const phone = row?.telefone || row?.celular || "";
      if (!phone) return <span className="text-muted-foreground text-xs">—</span>;
      const tpl = waTemplates?.whatsapp_template_aniversario || "";
      const text = renderWhatsappTemplate(tpl, {
        cliente: row?.nome || "",
        estabelecimento: nomeEstabelecimento,
      });
      return (
        <a
          href={buildWhatsappLink(phone, text)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition-colors"
          data-testid={`btn-wa-aniversario-${row?.id ?? row?.nome}`}
        >
          <MessageCircle className="h-3.5 w-3.5" /> Parabenizar
        </a>
      );
    }},
  ], [waTemplates, nomeEstabelecimento]);

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
