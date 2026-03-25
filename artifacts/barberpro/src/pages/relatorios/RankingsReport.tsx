import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { apiUrl, formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Award, Heart, Search, Trophy } from "lucide-react";
import { format, subDays } from "date-fns";

export default function RankingsReport() {
  const { barbeariaId } = useAuth();
  const [dataInicio, setDataInicio] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [dataFim, setDataFim] = useState(format(new Date(), "yyyy-MM-dd"));
  const [searchDI, setSearchDI] = useState(dataInicio);
  const [searchDF, setSearchDF] = useState(dataFim);

  const { data, isLoading } = useQuery<any>({
    queryKey: ["relatorio-rankings", barbeariaId, searchDI, searchDF],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/relatorios/rankings?dataInicio=${searchDI}&dataFim=${searchDF}`), { credentials: "include" });
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
    enabled: !!barbeariaId,
  });

  const MEDAL_COLORS = ["bg-amber-100 text-amber-600", "bg-slate-100 text-slate-500", "bg-orange-100 text-orange-600"];

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-foreground">Rankings</h1>
        <p className="text-foreground/40 text-[14px] mt-0.5">Profissionais e serviços mais populares</p>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-end gap-3 flex-wrap">
            <div className="space-y-1">
              <Label className="text-xs">Data Inicial</Label>
              <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data Final</Label>
              <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-40" />
            </div>
            <Button onClick={() => { setSearchDI(dataInicio); setSearchDF(dataFim); }} size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Search className="h-4 w-4 mr-1.5" /> Pesquisar
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-white rounded-2xl border border-black/[0.04] animate-pulse" />
          <div className="h-80 bg-white rounded-2xl border border-black/[0.04] animate-pulse" />
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" /> Ranking Profissionais
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.profissionais.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">Sem dados no período.</p>
              ) : (
                <div className="space-y-3">
                  {data.profissionais.map((p: any, idx: number) => (
                    <div key={p.nome} className="flex items-center justify-between p-3 rounded-xl bg-[#fafafa] hover:bg-black/[0.02] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-[11px] ${MEDAL_COLORS[idx] || "bg-black/[0.04] text-foreground/40"}`}>
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-medium text-[13px]">{p.nome}</p>
                          <p className="text-[11px] text-foreground/35">{p.atendimentos} atendimentos</p>
                        </div>
                      </div>
                      <p className="font-semibold text-[13px] text-primary">{formatCurrency(p.faturamento)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
                <Heart className="h-4 w-4 text-primary" /> Ranking Serviços
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.servicos.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">Sem dados no período.</p>
              ) : (
                <div className="space-y-3">
                  {data.servicos.map((s: any, idx: number) => (
                    <div key={s.nome} className="flex items-center justify-between p-3 rounded-xl bg-[#fafafa] hover:bg-black/[0.02] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-[11px] ${MEDAL_COLORS[idx] || "bg-black/[0.04] text-foreground/40"}`}>
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-medium text-[13px]">{s.nome}</p>
                          <p className="text-[11px] text-foreground/35">{s.quantidade}x realizados</p>
                        </div>
                      </div>
                      <p className="font-semibold text-[13px] text-primary">{formatCurrency(s.faturamento)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </AppLayout>
  );
}
