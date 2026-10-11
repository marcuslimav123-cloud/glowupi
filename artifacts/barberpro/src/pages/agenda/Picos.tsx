import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useListAgendamentos } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, subDays, eachDayOfInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Flame, TrendingDown, Clock, Zap } from "lucide-react";

const HORAS = Array.from({ length: 13 }, (_, i) => `${(i + 8).toString().padStart(2, "0")}:00`);
const DIAS_SEMANA = ["domingo","segunda","terca","quarta","quinta","sexta","sabado"];
const DIA_LABEL = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

function heatColor(pct: number) {
  if (pct === 0) return "bg-muted/30 text-muted-foreground/30";
  if (pct < 20) return "bg-blue-500/10 text-blue-300/50";
  if (pct < 40) return "bg-blue-500/20 text-blue-300";
  if (pct < 60) return "bg-yellow-500/30 text-yellow-300";
  if (pct < 80) return "bg-orange-500/40 text-orange-300";
  return "bg-red-500/50 text-red-200 font-bold";
}

export default function Picos() {
  const { barbeariaId } = useAuth();
  const [days] = useState(30);
  const dataInicio = format(subDays(new Date(), days - 1), "yyyy-MM-dd");
  const dataFim = format(new Date(), "yyyy-MM-dd");

  const allDays = useMemo(() => eachDayOfInterval({ start: subDays(new Date(), days - 1), end: new Date() }).map(d => format(d, "yyyy-MM-dd")), [days]);

  const { data: agendamentos = [], isLoading } = useListAgendamentos(barbeariaId!, {}, { query: { enabled: !!barbeariaId } });

  const heatmap = useMemo(() => {
    const map: Record<string, Record<string, { total: number; ocupados: number }>> = {};
    for (const dia of DIAS_SEMANA) {
      map[dia] = {};
      for (const hora of HORAS) map[dia][hora] = { total: 0, ocupados: 0 };
    }
    for (const data of allDays) {
      const diaSemana = DIAS_SEMANA[new Date(data + "T12:00:00").getDay()];
      for (const hora of HORAS) map[diaSemana][hora].total++;
    }
    for (const a of agendamentos as any[]) {
      if (!allDays.includes(a.data)) continue;
      if (a.status === "cancelado") continue;
      const diaSemana = DIAS_SEMANA[new Date(a.data + "T12:00:00").getDay()];
      const hora = a.horaInicio.slice(0, 2) + ":00";
      if (map[diaSemana]?.[hora]) map[diaSemana][hora].ocupados++;
    }
    return map;
  }, [agendamentos, allDays]);

  const insights = useMemo(() => {
    let maxPct = 0; let maxDia = ""; let maxHora = "";
    let minPct = 101; let minDia = ""; let minHora = "";
    for (const dia of DIAS_SEMANA) {
      for (const hora of HORAS) {
        const { total, ocupados } = heatmap[dia][hora];
        if (total === 0) continue;
        const pct = (ocupados / total) * 100;
        if (pct > maxPct) { maxPct = pct; maxDia = dia; maxHora = hora; }
        if (pct < minPct) { minPct = pct; minDia = dia; minHora = hora; }
      }
    }
    return { maxPct, maxDia, maxHora, minPct, minDia, minHora };
  }, [heatmap]);

  const DIA_NOME: Record<string,string> = { segunda:"Segunda",terca:"Terça",quarta:"Quarta",quinta:"Quinta",sexta:"Sexta",sabado:"Sábado",domingo:"Domingo" };

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Horários de pico</h1>
        <p className="text-muted-foreground mt-1">Análise de ocupação por dia e horário (últimos {days} dias)</p>
      </div>

      {insights.maxPct > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <div className="h-10 w-10 rounded-lg bg-red-500/20 flex items-center justify-center"><Flame className="h-5 w-5 text-red-400" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Horário mais movimentado</p>
              <p className="font-bold">{DIA_NOME[insights.maxDia]} às {insights.maxHora} <span className="text-red-400">({insights.maxPct.toFixed(0)}% ocupado)</span></p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center"><TrendingDown className="h-5 w-5 text-blue-400" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Horário mais vazio</p>
              <p className="font-bold">{DIA_NOME[insights.minDia]} às {insights.minHora} <span className="text-blue-400">({insights.minPct.toFixed(0)}% ocupado)</span></p>
            </div>
          </div>
        </div>
      )}

      <Card className="overflow-x-auto">
        <CardHeader><CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-primary" /> Mapa de Calor</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-64 animate-pulse bg-muted rounded-xl" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-separate border-spacing-1">
                <thead>
                  <tr>
                    <th className="text-left text-muted-foreground font-normal px-2 py-1 w-16">
                      <Clock className="h-4 w-4" />
                    </th>
                    {DIAS_SEMANA.map((d, i) => (
                      <th key={d} className="text-center text-muted-foreground font-medium px-2 py-1 min-w-[70px]">{DIA_LABEL[i]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {HORAS.map(hora => (
                    <tr key={hora}>
                      <td className="text-muted-foreground text-xs px-2 py-1 whitespace-nowrap">{hora}</td>
                      {DIAS_SEMANA.map(dia => {
                        const { total, ocupados } = heatmap[dia][hora];
                        const pct = total > 0 ? (ocupados / total) * 100 : 0;
                        return (
                          <td key={dia} className="px-0.5 py-0.5">
                            <div
                              className={`rounded-lg h-9 flex items-center justify-center text-xs transition-all ${heatColor(pct)} cursor-default`}
                              title={`${DIA_NOME[dia]} ${hora}: ${pct.toFixed(0)}% (${ocupados}/${total})`}
                            >
                              {pct > 0 ? `${pct.toFixed(0)}%` : ""}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center gap-4 mt-6 flex-wrap">
            <span className="text-xs text-muted-foreground">Legenda:</span>
            {[
              { label: "Sem dados", cls: "bg-muted/30" },
              { label: "< 20%", cls: "bg-blue-500/20" },
              { label: "20–40%", cls: "bg-blue-500/30" },
              { label: "40–60%", cls: "bg-yellow-500/30" },
              { label: "60–80%", cls: "bg-orange-500/40" },
              { label: "> 80%", cls: "bg-red-500/50" },
            ].map(({ label, cls }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={`h-4 w-6 rounded ${cls}`} />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-base">💡 Sugestões de Otimização</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {insights.maxPct > 70 && (
            <div className="flex gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <span className="text-orange-400 shrink-0">⚡</span>
              <p>Seu horário mais cheio é <strong>{DIA_NOME[insights.maxDia]} às {insights.maxHora}</strong> ({insights.maxPct.toFixed(0)}% de ocupação). Considere adicionar um profissional neste turno ou aumentar levemente os preços.</p>
            </div>
          )}
          {insights.minPct < 20 && (
            <div className="flex gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <span className="text-blue-400 shrink-0">📉</span>
              <p><strong>{DIA_NOME[insights.minDia]} às {insights.minHora}</strong> é seu horário mais vazio ({insights.minPct.toFixed(0)}%). Que tal criar promoções para este horário e aumentar o movimento?</p>
            </div>
          )}
          <div className="flex gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <span className="text-green-400 shrink-0">✅</span>
            <p>Continue monitorando os dados para identificar padrões sazonais e ajustar sua estratégia de preços e equipe ao longo do tempo.</p>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
